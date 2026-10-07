import type { Request, Response } from "express";

import { challengesService } from "./challenges.service";
import {
  parseChallengeCreateBody,
  parseChallengeListQuery,
  parseChallengeUpdateBody,
} from "./challenges.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

export const challengesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseChallengeListQuery(req.query);
      res.status(200).json({ success: true, ...(await challengesService.getAll(query)) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch challenges.");
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const challenge = await challengesService.getById(id, req.query.language);
      if (!challenge) {
        sendError(res, 404, "Challenge not found.");
        return;
      }
      res.status(200).json({ success: true, challenge });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to fetch challenge.");
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;
    try {
      payload = parseChallengeCreateBody(req.body);
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Invalid challenge data.");
      return;
    }
    try {
      const challenge = await challengesService.create(payload);
      res.status(201).json({ success: true, message: "Challenge created successfully.", challenge });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to create challenge.");
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;
    try {
      payload = parseChallengeUpdateBody(req.body);
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Invalid challenge update data.");
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const challenge = await challengesService.update(id, payload);
      if (!challenge) {
        sendError(res, 404, "Challenge not found.");
        return;
      }
      res.status(200).json({ success: true, message: "Challenge updated successfully.", challenge });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update challenge.";
      sendError(res, message === "Challenge end time must be after its start time." ? 400 : 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const challenge = await challengesService.delete(id);
      if (!challenge) {
        sendError(res, 404, "Challenge not found.");
        return;
      }
      res.status(200).json({ success: true, message: "Challenge deleted successfully.", challenge });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to delete challenge.");
    }
  },

  join: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized.");
      return;
    }
    const challengeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const userChallenge = await challengesService.join(req.user.id, challengeId, req.query.language);
      res.status(201).json({ success: true, message: "Challenge joined successfully.", userChallenge });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join challenge.";
      const status = message === "Challenge not found." || message === "User not found."
        ? 404
        : 400;
      sendError(res, status, message);
    }
  },
};