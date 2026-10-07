import type { Request, Response } from "express";

import { challengesService } from "./challenges.service";
import { parseUserChallengeProgressBody } from "./challenges.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

export const userChallengesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }
    try {
      const userChallenges = await challengesService.getUserChallenges(req.user.id, req.query.language);
      res.status(200).json({ success: true, userChallenges });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user challenges.";
      sendError(res, message === "User not found." ? 404 : 500, message);
    }
  },

  claimRewards: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const userChallenge = await challengesService.claimRewards(req.user.id, id);
      if (!userChallenge) {
        sendError(res, 404, "User challenge not found.");
        return;
      }
      res.status(200).json({ success: true, message: "Challenge rewards claimed successfully.", userChallenge });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to claim challenge rewards.");
    }
  },

  updateProgress: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }
    let payload;
    try {
      payload = parseUserChallengeProgressBody(req.body);
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Invalid challenge progress data.");
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const userChallenge = await challengesService.updateProgress(req.user.id, id, payload);
      if (!userChallenge) {
        sendError(res, 404, "User challenge not found.");
        return;
      }
      res.status(200).json({ success: true, message: "Challenge progress updated successfully.", userChallenge });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to update challenge progress.");
    }
  },
};