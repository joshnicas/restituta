import type { Request, Response } from "express";

import { competenciesService } from "./competencies.service";
import { parseCompetencyCreateBody, parseCompetencyUpdateBody } from "./competencies.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const competenciesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const competencies = await competenciesService.getAll();
      res.status(200).json({
        success: true,
        competencies,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch competencies.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const competency = await competenciesService.getById(id);

      if (!competency) {
        sendError(res, 404, "Competency not found.");
        return;
      }

      res.status(200).json({
        success: true,
        competency,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch competency.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseCompetencyCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid competency data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const competency = await competenciesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Competency created successfully.",
        competency,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create competency.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseCompetencyUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid competency update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const competency = await competenciesService.update(id, payload);

      if (!competency) {
        sendError(res, 404, "Competency not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Competency updated successfully.",
        competency,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update competency.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const competency = await competenciesService.delete(id);

      if (!competency) {
        sendError(res, 404, "Competency not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Competency deleted successfully.",
        competency,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete competency.";
      sendError(res, 500, message);
    }
  },
};
