import type { Request, Response } from "express";

import { levelsService } from "./levels.service";
import { parseLevelCreateBody, parseLevelUpdateBody } from "./levels.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const levelsController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const levels = await levelsService.getAll();

      res.status(200).json({
        success: true,
        levels,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch levels.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const level = await levelsService.getById(id);

      if (!level) {
        sendError(res, 404, "Level not found.");
        return;
      }

      res.status(200).json({
        success: true,
        level,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch level.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseLevelCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid level data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const level = await levelsService.create(payload);

      res.status(201).json({
        success: true,
        message: "Level created successfully.",
        level,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create level.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseLevelUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid level update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const level = await levelsService.update(id, payload);

      if (!level) {
        sendError(res, 404, "Level not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Level updated successfully.",
        level,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update level.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const level = await levelsService.delete(id);

      if (!level) {
        sendError(res, 404, "Level not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Level deleted successfully.",
        level,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete level.";
      sendError(res, 500, message);
    }
  },

  getQuestions: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await levelsService.getQuestionsByLevelId(id);

      if (!result) {
        sendError(res, 404, "Level not found.");
        return;
      }

      res.status(200).json({
        success: true,
        level: result.level,
        questions: result.questions,
        count: result.count,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch questions.";
      sendError(res, 500, message);
    }
  },
};
