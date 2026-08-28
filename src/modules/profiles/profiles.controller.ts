import type { Request, Response } from "express";

import { profilesService } from "./profiles.service";
import { parseProfileUpdateBody } from "./profiles.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const profilesController = {
  getMe: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const profile = await profilesService.getByUserId(req.user.id);

      if (!profile) {
        sendError(res, 404, "Profile not found.");
        return;
      }

      res.status(200).json({
        success: true,
        profile,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch profile.";
      sendError(res, 500, message);
    }
  },

  updateMe: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const payload = parseProfileUpdateBody(req.body);
      const profile = await profilesService.update(req.user.id, payload);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      sendError(res, 400, message);
    }
  },
};
