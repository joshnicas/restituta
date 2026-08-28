import type { Request, Response } from "express";

import prisma from "../../prisma";
import { usersService } from "../users/users.service";
import { parseAdminLoginBody, parseAdminRegisterBody, parseAdminUpdateUserBody } from "./admin.schema";
import { adminAuthService } from "./admin.service";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const adminController = {
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseAdminLoginBody(req.body);
      const result = await adminAuthService.login(payload);

      res.status(200).json({
        success: true,
        message: "Admin login successful.",
        token: result.token,
        admin: result.admin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin login failed.";
      sendError(res, 401, message);
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.admin) {
      sendError(res, 401, "Unauthorized admin.");
      return;
    }

    res.status(200).json({
      success: true,
      admin: req.admin,
    });
  },

  listUsers: async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await usersService.getAll();

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users.";
      sendError(res, 500, message);
    }
  },

  deleteUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = Number(id);

      if (!Number.isInteger(userId)) {
        sendError(res, 400, "Invalid user id.");
        return;
      }

      const user = await usersService.getById(id);

      if (!user) {
        sendError(res, 404, "User not found.");
        return;
      }

      await prisma.user.delete({ where: { id: userId } });

      res.status(200).json({
        success: true,
        message: "User deleted successfully.",
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user.";
      sendError(res, 500, message);
    }
  },

  updateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = Number(id);

      if (!Number.isInteger(userId)) {
        sendError(res, 400, "Invalid user id.");
        return;
      }

      const existingUser = await usersService.getById(id);

      if (!existingUser) {
        sendError(res, 404, "User not found.");
        return;
      }

      const payload = parseAdminUpdateUserBody(req.body);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: payload,
        select: {
          id: true,
          userID: true,
          email: true,
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
        success: true,
        message: "User updated successfully.",
        user: {
          id: updatedUser.id.toString(),
          userID: updatedUser.userID,
          email: updatedUser.email,
          gradeId: updatedUser.gradeId,
          grade: updatedUser.grade
            ? {
                id: updatedUser.grade.id.toString(),
                name: updatedUser.grade.name,
                code: updatedUser.grade.code,
              }
            : null,
          profilePic: updatedUser.profilePic,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user.";
      sendError(res, 500, message);
    }
  },

  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseAdminRegisterBody(req.body);
      const created = await adminAuthService.register(payload);

      res.status(201).json({
        success: true,
        message: "Admin registered successfully.",
        admin: created,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin registration failed.";
      sendError(res, 400, message);
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    if (!req.admin) {
      sendError(res, 401, "Unauthorized admin.");
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully. Please discard the token on the client.",
    });
  },
};
