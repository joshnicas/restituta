import type { Request, Response } from "express";

import { streaksService } from "./streaks.service";

export const streaksController = {
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