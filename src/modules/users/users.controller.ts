import type { Request, Response } from "express";
import { z } from "zod";

import { usersService } from "./users.service";
import prisma from "../../prisma";

export const usersController = {
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      
      const result = await usersService.getAll(page, limit);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users.";
      res.status(500).json({ message });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await usersService.getById(id);

      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user.";
      res.status(500).json({ message });
    }
  },

  getMe: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const user = await usersService.getMe(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({ user });
  },

  deleteAccount: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const userId = Number(req.user.id);
    if (!Number.isInteger(userId)) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const payments = await tx.payment.findMany({
          where: { userId },
          select: { id: true },
        });
        const paymentIds = payments.map(({ id }) => id);

        // Payment events are retained as provider audit records, detached from the account.
        if (paymentIds.length > 0) {
          await tx.paymentEvent.updateMany({
            where: { paymentId: { in: paymentIds } },
            data: { paymentId: null },
          });
        }

        // The schema restricts deleting users with billing history. Remove dependent billing
        // records in FK order; all other user-owned records cascade from User.
        await tx.subscription.deleteMany({ where: { userId } });
        await tx.payment.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });

      res.status(200).json({ success: true, message: "Account deleted successfully." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account.";
      res.status(500).json({ message });
    }
  },

  updateLanguage: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    try {
      const schema = z.object({ language: z.enum(["EN", "SW"]) });
      const payload = schema.parse(req.body);

      const user = await prisma.user.update({
        where: { id: Number(req.user.id) },
        data: { language: payload.language },
        select: { id: true, userID: true, email: true, phoneNumber: true, emailStatus: true, language: true, selectedPlayer: true },
      });

      res.status(200).json({
        message: "Language updated successfully.",
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update language.";
      res.status(400).json({ message });
    }
  },
};
