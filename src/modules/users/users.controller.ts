import type { Request, Response } from "express";

import { usersService } from "./users.service";

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
};
