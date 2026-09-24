import type { Request, Response } from "express";

import { audioCategoriesService } from "./audio-categories.service";
import {
  parseAudioCategoryCreateBody,
  parseAudioCategoryUpdateBody,
} from "./audio-categories.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const audioCategoriesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await audioCategoriesService.getAll();
      res.status(200).json({
        success: true,
        audioCategories: categories,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch audio categories.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await audioCategoriesService.getById(id);

      if (!category) {
        sendError(res, 404, "Audio category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        audioCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch audio category.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseAudioCategoryCreateBody(req.body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid audio category data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const category = await audioCategoriesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Audio category created successfully.",
        audioCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create audio category.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseAudioCategoryUpdateBody(req.body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid audio category update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await audioCategoriesService.update(id, payload);

      if (!category) {
        sendError(res, 404, "Audio category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Audio category updated successfully.",
        audioCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update audio category.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await audioCategoriesService.delete(id);

      if (!category) {
        sendError(res, 404, "Audio category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Audio category deleted successfully.",
        audioCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete audio category.";
      sendError(res, 500, message);
    }
  },
};
