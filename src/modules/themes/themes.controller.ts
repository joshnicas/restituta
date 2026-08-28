import type { Request, Response } from "express";

import { themesService } from "./themes.service";
import { parseThemeCreateBody, parseThemeUpdateBody } from "./themes.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const themesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const themes = await themesService.getAll();
      res.status(200).json({
        success: true,
        themes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch themes.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const theme = await themesService.getById(id);

      if (!theme) {
        sendError(res, 404, "Theme not found.");
        return;
      }

      res.status(200).json({
        success: true,
        theme,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch theme.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseThemeCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid theme data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const theme = await themesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Theme created successfully.",
        theme,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create theme.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseThemeUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid theme update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const theme = await themesService.update(id, payload);

      if (!theme) {
        sendError(res, 404, "Theme not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Theme updated successfully.",
        theme,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update theme.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const theme = await themesService.delete(id);

      if (!theme) {
        sendError(res, 404, "Theme not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Theme deleted successfully.",
        theme,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete theme.";
      sendError(res, 500, message);
    }
  },
};
