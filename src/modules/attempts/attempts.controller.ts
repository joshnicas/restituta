import type { Request, Response } from "express";

import { attemptsService } from "./attempts.service";
import { parseAttemptCreateBody, parseAttemptQuery } from "./attempts.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const attemptsController = {
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const payload = parseAttemptCreateBody(req.body);
      const attempt = await attemptsService.create(req.user.id, payload);

      res.status(201).json({
        success: true,
        message: "Attempt recorded successfully.",
        attempt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record attempt.";
      sendError(res, 400, message);
    }
  },

  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }

    try {
      const query = parseAttemptQuery(req.query);
      const result = await attemptsService.getByUserId(req.user.id, query);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch attempts.";
      sendError(res, 400, message);
    }
  },
};
