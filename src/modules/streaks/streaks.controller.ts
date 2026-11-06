import type { Request, Response } from "express";

import { streaksService } from "./streaks.service";

export const streaksController = {
  getByUserId: async (req: Request, res: Response): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = Number(rawId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, message: "Invalid user id." });
      return;
    }
    try {
      const overview = await streaksService.getOverview(userId);
      if (!overview) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }
      res.status(200).json({ success: true, ...overview });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch streak information.";
      res.status(500).json({ success: false, message });
    }
  },
  getMe: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    try {
      const overview = await streaksService.getOverview(Number(req.user.id));
      if (!overview) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }
      res.status(200).json({ success: true, ...overview });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch streak information.";
      res.status(500).json({ success: false, message });
    }
  },
};
