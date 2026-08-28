import type { Request, Response } from "express";

import prisma from "../../prisma";
import { authService } from "./auth.service";
import { parseLoginBody, parseRegisterBody, parseUpdateAccountBody } from "./auth.schema";

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseRegisterBody(req.body);
      const result = await authService.register(payload);

      const fullUser = await prisma.user.findUnique({
        where: { id: Number(result.user.id) },
        select: {
          id: true,
          userID: true,
          email: true,
          name: true,
          DoB: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          profilePic: true,
        },
      });

      res.status(201).json({
        message: "User registered successfully.",
        user: fullUser
          ? {
              id: fullUser.id.toString(),
              userID: fullUser.userID,
              email: fullUser.email,
              name: fullUser.name,
              DoB: fullUser.DoB,
              gradeId: fullUser.gradeId,
              grade: fullUser.grade
                ? {
                    id: fullUser.grade.id.toString(),
                    name: fullUser.grade.name,
                    code: fullUser.grade.code,
                  }
                : null,
              profilePic: fullUser.profilePic,
            }
          : result.user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      res.status(400).json({ message });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseLoginBody(req.body);
      const result = await authService.login(payload);

      const fullUser = await prisma.user.findUnique({
        where: { id: Number(result.user.id) },
        select: {
          id: true,
          userID: true,
          email: true,
          name: true,
          DoB: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          profilePic: true,
        },
      });

      res.status(200).json({
        message: "Login successful.",
        token: result.token,
        user: fullUser
          ? {
              id: fullUser.id.toString(),
              userID: fullUser.userID,
              email: fullUser.email,
              name: fullUser.name,
              DoB: fullUser.DoB,
              gradeId: fullUser.gradeId,
              grade: fullUser.grade
                ? {
                    id: fullUser.grade.id.toString(),
                    name: fullUser.grade.name,
                    code: fullUser.grade.code,
                  }
                : null,
              profilePic: fullUser.profilePic,
            }
          : result.user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      res.status(401).json({ message });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(req.user.id) },
      select: {
        id: true,
        userID: true,
        email: true,
        name: true,
        DoB: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        profilePic: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id.toString(),
        userID: user.userID,
        email: user.email,
        name: user.name,
        DoB: user.DoB,
        gradeId: user.gradeId,
        grade: user.grade
          ? {
              id: user.grade.id.toString(),
              name: user.grade.name,
              code: user.grade.code,
            }
          : null,
        profilePic: user.profilePic,
      },
    });
  },

  updateAccount: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    try {
      const payload = parseUpdateAccountBody(req.body);
      const result = await authService.updateAccount(req.user.id, payload);

      const fullUser = await prisma.user.findUnique({
        where: { id: Number(req.user.id) },
        select: {
          id: true,
          userID: true,
          email: true,
          name: true,
          DoB: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          profilePic: true,
        },
      });

      res.status(200).json({
        message: result.message,
        user: fullUser
          ? {
              id: fullUser.id.toString(),
              userID: fullUser.userID,
              email: fullUser.email,
              name: fullUser.name,
              DoB: fullUser.DoB,
              gradeId: fullUser.gradeId,
              grade: fullUser.grade
                ? {
                    id: fullUser.grade.id.toString(),
                    name: fullUser.grade.name,
                    code: fullUser.grade.code,
                  }
                : null,
              profilePic: fullUser.profilePic,
            }
          : result.user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed.";
      res.status(400).json({ message });
    }
  },
};
