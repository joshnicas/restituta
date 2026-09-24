import type { Request, Response } from "express";

import { imageCategoriesService } from "./image-categories.service";
import {
  parseImageCategoryCreateBody,
  parseImageCategoryUpdateBody,
} from "./image-categories.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const imageCategoriesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await imageCategoriesService.getAll();
      res.status(200).json({
        success: true,
        imageCategories: categories,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch image categories.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await imageCategoriesService.getById(id);

      if (!category) {
        sendError(res, 404, "Image category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        imageCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch image category.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseImageCategoryCreateBody(req.body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid image category data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const category = await imageCategoriesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Image category created successfully.",
        imageCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create image category.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseImageCategoryUpdateBody(req.body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid image category update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await imageCategoriesService.update(id, payload);

      if (!category) {
        sendError(res, 404, "Image category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Image category updated successfully.",
        imageCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update image category.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await imageCategoriesService.delete(id);

      if (!category) {
        sendError(res, 404, "Image category not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Image category deleted successfully.",
        imageCategory: category,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete image category.";
      sendError(res, 500, message);
    }
  },
};
