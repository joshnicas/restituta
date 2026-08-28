import type { Request, Response } from "express";

import { progressService } from "./progress.service";
import { parseProgressCreateBody, parseProgressUpdateBody } from "./progress.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const progressController = {
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const progress = await progressService.getByUserId(req.user.id);
      res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch progress.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const payload = parseProgressCreateBody(req.body);
      const progress = await progressService.create(req.user.id, payload);

      res.status(201).json({
        success: true,
        message: "Progress recorded successfully.",
        progress,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record progress.";
      sendError(res, 400, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const gameLevelId = Array.isArray(req.params.levelId) ? Number(req.params.levelId[0]) : Number(req.params.levelId);
      const payload = parseProgressUpdateBody(req.body);
      const progress = await progressService.update(req.user.id, gameLevelId, payload);

      if (!progress) {
        sendError(res, 404, "Progress not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Progress updated successfully.",
        progress,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update progress.";
      sendError(res, 400, message);
    }
  },
};
