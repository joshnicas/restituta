import type { Request, Response } from "express";

import { gradesService } from "./grades.service";
import { parseGradeCreateBody, parseGradeUpdateBody } from "./grades.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const gradesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const grades = await gradesService.getAll();
      res.status(200).json({
        success: true,
        grades,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch grades.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const grade = await gradesService.getById(id);

      if (!grade) {
        sendError(res, 404, "Grade not found.");
        return;
      }

      res.status(200).json({
        success: true,
        grade,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch grade.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseGradeCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid grade data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const grade = await gradesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Grade created successfully.",
        grade,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create grade.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseGradeUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid grade update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const grade = await gradesService.update(id, payload);

      if (!grade) {
        sendError(res, 404, "Grade not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Grade updated successfully.",
        grade,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update grade.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const grade = await gradesService.delete(id);

      if (!grade) {
        sendError(res, 404, "Grade not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Grade deleted successfully.",
        grade,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete grade.";
      sendError(res, 500, message);
    }
  },

  getSubjects: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.gradeId) ? req.params.gradeId[0] : req.params.gradeId;
      const result = await gradesService.getSubjectsByGradeId(id);

      if (!result) {
        sendError(res, 404, "Grade not found.");
        return;
      }

      res.status(200).json({
        success: true,
        grade: result.grade,
        subjects: result.subjects,
        count: result.count,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch subjects.";
      sendError(res, 500, message);
    }
  },
};
