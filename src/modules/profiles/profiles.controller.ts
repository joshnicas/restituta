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
  // GET /profiles
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      
      const result = await profilesService.listAll(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch profiles.";
      sendError(res, 500, message);
    }
  },

  // GET /profiles/me?userId=123  (no auth required; accepts optional query `userId`)
  getMe: async (req: Request, res: Response): Promise<void> => {
    const userIdFromQuery = req.query.userId as string | undefined;
    const effectiveUserId = req.user?.id ?? userIdFromQuery;

    if (!effectiveUserId) {
      sendError(res, 400, "No user context. Provide `userId` query param.");
      return;
    }

    try {
      const profile = await profilesService.getByUserId(String(effectiveUserId));

      if (!profile) {
        sendError(res, 404, "Profile not found.");
        return;
      }

      res.status(200).json({ success: true, profile });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch profile.";
      sendError(res, 500, message);
    }
  },

  // POST /profiles  body: { userId: string|number, ...profileFields }
  create: async (req: Request, res: Response): Promise<void> => {
    const { userId, ...rest } = req.body ?? {};

    if (!userId) {
      sendError(res, 400, "Missing required field `userId` in body.");
      return;
    }

    try {
      const payload = parseProfileUpdateBody(rest);
      const profile = await profilesService.create(String(userId), payload);

      res.status(201).json({ success: true, message: "Profile created.", profile });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create profile.";
      sendError(res, 400, message);
    }
  },

  // PATCH /profiles/:id  (id is userId)
  updateById: async (req: Request, res: Response): Promise<void> => {
    const userId = String(req.params.id);

    try {
      const payload = parseProfileUpdateBody(req.body);
      const profile = await profilesService.update(userId, payload);

      res.status(200).json({ success: true, message: "Profile updated successfully.", profile });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      sendError(res, 400, message);
    }
  },

  // DELETE /profiles/:id
  deleteById: async (req: Request, res: Response): Promise<void> => {
    const userId = String(req.params.id);

    try {
      await profilesService.deleteByUserId(userId);
      res.status(200).json({ success: true, message: "Profile deleted." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete profile.";
      sendError(res, 400, message);
    }
  },
};
