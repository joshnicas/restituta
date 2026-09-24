import type { Request, Response } from "express";

import { parseLeaderboardQuery } from "./leaderboards.schema";
import { leaderboardsService } from "./leaderboards.service";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

function parseId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Grade ID must be a positive integer.");
  }
  return id;
}

function parseSubjectId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Subject ID must be a positive integer.");
  }
  return id;
}

function paginate<T>(entries: T[], page: number, limit: number): { entries: T[]; total: number; page: number; limit: number; totalPages: number } {
  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    entries: entries.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
  };
}

export const leaderboardsController = {
  global: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseLeaderboardQuery(req.query);
      const entries = await leaderboardsService.getGlobal(query);
      res.status(200).json({ success: true, period: query.period, metric: query.metric, ...paginate(entries, query.page, query.limit) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch leaderboard.");
    }
  },

  byGrade: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseLeaderboardQuery(req.query);
      const entries = await leaderboardsService.getByGrade(query);
      res.status(200).json({ success: true, period: query.period, metric: query.metric, ...paginate(entries, query.page, query.limit) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch grade leaderboards.");
    }
  },

  grade: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseLeaderboardQuery(req.query);
      const gradeId = parseId(String(req.params.gradeId));
      const entry = await leaderboardsService.getGrade(gradeId, query);

      if (entry.length === 0) {
        sendError(res, 404, "No leaderboard result found for this grade.");
        return;
      }

      res.status(200).json({ success: true, period: query.period, metric: query.metric, ...paginate(entry, query.page, query.limit) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch grade leaderboard.");
    }
  },

  subjectsByGrade: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseLeaderboardQuery(req.query);
      const gradeId = parseId(String(req.params.gradeId));
      const entries = await leaderboardsService.getSubjectsByGrade(gradeId, query);
      res.status(200).json({ success: true, gradeId, period: query.period, metric: query.metric, ...paginate(entries, query.page, query.limit) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch subject leaderboards.");
    }
  },

  subject: async (req: Request, res: Response): Promise<void> => {
    try {
      const query = parseLeaderboardQuery(req.query);
      const gradeId = parseId(String(req.params.gradeId));
      const subjectId = parseSubjectId(String(req.params.subjectId));
      const entries = await leaderboardsService.getSubject(gradeId, subjectId, query);

      if (entries.length === 0) {
        sendError(res, 404, "No leaderboard result found for this grade and subject.");
        return;
      }

      res.status(200).json({ success: true, period: query.period, metric: query.metric, ...paginate(entries, query.page, query.limit) });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to fetch subject leaderboard.");
    }
  },
};