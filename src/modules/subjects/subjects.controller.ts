import type { Request, Response } from "express";

import { subjectsService } from "./subjects.service";
import { parseSubjectCreateBody, parseSubjectUpdateBody } from "./subjects.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const subjectsController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const subjects = await subjectsService.getAll();

      res.status(200).json({
        success: true,
        subjects,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch subjects.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const subject = await subjectsService.getById(id);

      if (!subject) {
        sendError(res, 404, "Subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        subject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch subject.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseSubjectCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid subject data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const subject = await subjectsService.create(payload);

      res.status(201).json({
        success: true,
        message: "Subject created successfully.",
        subject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create subject.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseSubjectUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid subject update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const subject = await subjectsService.update(id, payload);

      if (!subject) {
        sendError(res, 404, "Subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Subject updated successfully.",
        subject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update subject.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const subject = await subjectsService.delete(id);

      if (!subject) {
        sendError(res, 404, "Subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Subject deleted successfully.",
        subject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete subject.";
      sendError(res, 500, message);
    }
  },
};
