import type { Request, Response } from "express";
import { parsePracticeAnswer, parsePracticeStart, PracticeRequestError } from "./practice.schema";
import { PracticeError, practiceService } from "./practice.service";

function sendError(res: Response, error: unknown): void {
  const status = error instanceof PracticeError ? error.status : error instanceof PracticeRequestError ? 400 : 500;
  const message = error instanceof Error ? error.message : "Practice request failed.";
  res.status(status).json({ success: false, message });
}

function getUserId(req: Request, res: Response): number | null {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(401).json({ success: false, message: "Unauthorized." });
    return null;
  }
  return userId;
}

function getSessionId(req: Request): string {
  const value = req.params.sessionId;
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export const practiceController = {
  home: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    try { res.status(200).json(await practiceService.home(userId)); }
    catch (error) { sendError(res, error); }
  },

  subject: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(subjectId) || subjectId < 1) {
      res.status(400).json({ success: false, message: "Invalid subject ID." });
      return;
    }
    try { res.status(200).json(await practiceService.subject(userId, subjectId)); }
    catch (error) { sendError(res, error); }
  },

  start: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    try { res.status(201).json(await practiceService.start(userId, parsePracticeStart(req.body))); }
    catch (error) { sendError(res, error); }
  },

  getSession: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    try { res.status(200).json(await practiceService.getSession(userId, getSessionId(req))); }
    catch (error) { sendError(res, error); }
  },

  answer: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    try { res.status(200).json(await practiceService.answer(userId, getSessionId(req), parsePracticeAnswer(req.body))); }
    catch (error) { sendError(res, error); }
  },

  complete: async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req, res);
    if (userId === null) return;
    try { res.status(200).json(await practiceService.complete(userId, getSessionId(req))); }
    catch (error) { sendError(res, error); }
  },
};