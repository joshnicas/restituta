import type { Request, Response } from "express";

import { questionsService } from "./questions.service";
import { parseQuestionCreateBody, parseQuestionUpdateBody } from "./questions.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const questionsController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const rawPage = req.query.page;
      const rawLimit = req.query.limit;
      const language = req.query.language;

      const page = Number(rawPage ?? 1);
      const limit = Number(rawLimit ?? 20);

      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        sendError(res, 400, "Page must be positive and limit must be an integer between 1 and 100.");
        return;
      }

      const parseOptionalId = (value: unknown, name: string): number | undefined => {
        if (value === undefined) return undefined;
        const raw = Array.isArray(value) ? value[0] : value;
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
        return parsed;
      };

      let gradeSubjectId: number | undefined;
      let gameLevelId: number | undefined;
      let topicId: number | undefined;
      let gameTypeId: number | undefined;
      try {
        gradeSubjectId = parseOptionalId(req.query.gradeSubjectId, "gradeSubjectId");
        gameLevelId = parseOptionalId(req.query.gameLevelId, "gameLevelId");
        topicId = parseOptionalId(req.query.topicId, "topicId");
        gameTypeId = parseOptionalId(req.query.gameTypeId, "gameTypeId");
      } catch (error) {
        sendError(res, 400, error instanceof Error ? error.message : "Invalid question filter.");
        return;
      }

      let active: boolean | undefined;
      const rawActive = Array.isArray(req.query.active) ? req.query.active[0] : req.query.active;
      if (rawActive !== undefined) {
        if (rawActive !== "true" && rawActive !== "false") {
          sendError(res, 400, "active must be true or false.");
          return;
        }
        active = rawActive === "true";
      }

      const result = await questionsService.getAll({
        page,
        limit,
        language,
        gradeSubjectId,
        gameLevelId,
        topicId,
        gameTypeId,
        active,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch questions.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const question = await questionsService.getById(id, req.query.language);

      if (!question) {
        sendError(res, 404, "Question not found.");
        return;
      }

      res.status(200).json({
        success: true,
        question,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch question.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseQuestionCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid question data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const question = await questionsService.create(payload);

      res.status(201).json({
        success: true,
        message: "Question created successfully.",
        question,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create question.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseQuestionUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid question update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const question = await questionsService.update(id, payload);

      if (!question) {
        sendError(res, 404, "Question not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Question updated successfully.",
        question,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update question.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const question = await questionsService.delete(id);

      if (!question) {
        sendError(res, 404, "Question not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Question deleted successfully.",
        question,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete question.";
      sendError(res, 500, message);
    }
  },
};
