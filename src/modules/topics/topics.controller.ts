import type { Request, Response } from "express";

import { topicsService } from "./topics.service";
import { parseTopicCreateBody, parseTopicUpdateBody } from "./topics.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const topicsController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const topics = await topicsService.getAll();

      res.status(200).json({
        success: true,
        topics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch topics.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const topic = await topicsService.getById(id);

      if (!topic) {
        sendError(res, 404, "Topic not found.");
        return;
      }

      res.status(200).json({
        success: true,
        topic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch topic.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseTopicCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid topic data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const topic = await topicsService.create(payload);

      res.status(201).json({
        success: true,
        message: "Topic created successfully.",
        topic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create topic.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseTopicUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid topic update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const topic = await topicsService.update(id, payload);

      if (!topic) {
        sendError(res, 404, "Topic not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Topic updated successfully.",
        topic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update topic.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const topic = await topicsService.delete(id);

      if (!topic) {
        sendError(res, 404, "Topic not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Topic deleted successfully.",
        topic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete topic.";
      sendError(res, 500, message);
    }
  },

  getQuestions: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await topicsService.getQuestionsByTopicId(id);

      if (!result) {
        sendError(res, 404, "Topic not found.");
        return;
      }

      res.status(200).json({
        success: true,
        topic: result.topic,
        questions: result.questions,
        count: result.count,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch questions.";
      sendError(res, 500, message);
    }
  },
};
