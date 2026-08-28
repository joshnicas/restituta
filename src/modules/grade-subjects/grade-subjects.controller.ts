import type { Request, Response } from "express";

import { gradeSubjectsService } from "./grade-subjects.service";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const gradeSubjectsController = {
  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const gradeSubject = await gradeSubjectsService.getById(id);

      if (!gradeSubject) {
        sendError(res, 404, "Grade subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        gradeSubject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch grade subject.";
      sendError(res, 500, message);
    }
  },

  getTopics: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await gradeSubjectsService.getTopicsByGradeSubjectId(id);

      if (!result) {
        sendError(res, 404, "Grade subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        gradeSubjectId: result.gradeSubjectId,
        topics: result.topics,
        count: result.count,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch topics.";
      sendError(res, 500, message);
    }
  },

  getLevels: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await gradeSubjectsService.getLevelsByGradeSubjectId(id);

      if (!result) {
        sendError(res, 404, "Grade subject not found.");
        return;
      }

      res.status(200).json({
        success: true,
        gradeSubjectId: result.gradeSubjectId,
        levels: result.levels,
        count: result.count,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch levels.";
      sendError(res, 500, message);
    }
  },
};
