import type { Request, Response } from "express";
import { giftsService } from "./gifts.service";
import {
  parseGiftAwardBody,
  parseGiftCreateBody,
  parseGiftPagination,
  parseGiftUpdateBody,
} from "./gifts.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

function parseUserId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function param(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? raw[0] : raw ?? "";
}

export const giftsController = {
  listDefinitions: async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({ success: true, gifts: await giftsService.listDefinitions(req.query.language) });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to fetch gifts.");
    }
  },

  getDefinition: async (req: Request, res: Response): Promise<void> => {
    try {
      const gift = await giftsService.getDefinition(param(req.params.id), req.query.language);
      if (!gift) return sendError(res, 404, "Gift not found.");
      res.status(200).json({ success: true, gift });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to fetch gift.");
    }
  },

  createDefinition: async (req: Request, res: Response): Promise<void> => {
    try {
      const gift = await giftsService.createDefinition(parseGiftCreateBody(req.body));
      res.status(201).json({ success: true, gift });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to create gift.");
    }
  },

  updateDefinition: async (req: Request, res: Response): Promise<void> => {
    try {
      const gift = await giftsService.updateDefinition(param(req.params.id), parseGiftUpdateBody(req.body), req.query.language);
      if (!gift) return sendError(res, 404, "Gift not found.");
      res.status(200).json({ success: true, gift });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "Failed to update gift.");
    }
  },

  deleteDefinition: async (req: Request, res: Response): Promise<void> => {
    try {
      const gift = await giftsService.deleteDefinition(param(req.params.id));
      if (!gift) return sendError(res, 404, "Gift not found.");
      res.status(200).json({ success: true, gift });
    } catch (error) {
      sendError(res, 409, error instanceof Error ? error.message : "Gift is already awarded and cannot be deleted.");
    }
  },

  award: async (req: Request, res: Response): Promise<void> => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return sendError(res, 400, "Invalid user id.");
    try {
      const { giftId } = parseGiftAwardBody(req.body);
      const result = await giftsService.award(userId, giftId, req.query.language);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to award gift.";
      sendError(res, message === "User not found." || message === "Gift not found." ? 404 : 500, message);
    }
  },

  listUserGifts: async (req: Request, res: Response): Promise<void> => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return sendError(res, 400, "Invalid user id.");
    if (!req.user || req.user.id !== String(userId)) return sendError(res, 403, "You can only view your own gifts.");
    try {
      const { page, limit } = parseGiftPagination(req.query);
      const result = await giftsService.listUserGifts(userId, page, limit, req.query.language);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user gifts.";
      sendError(res, message === "User not found." ? 404 : 400, message);
    }
  },

  getUserGift: async (req: Request, res: Response): Promise<void> => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return sendError(res, 400, "Invalid user id.");
    if (!req.user || req.user.id !== String(userId)) return sendError(res, 403, "You can only view your own gifts.");
    try {
      const userGift = await giftsService.getUserGift(userId, param(req.params.userGiftId), req.query.language);
      if (!userGift) return sendError(res, 404, "User gift not found.");
      res.status(200).json({ success: true, userGift });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to fetch user gift.");
    }
  },

  markViewed: async (req: Request, res: Response): Promise<void> => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return sendError(res, 400, "Invalid user id.");
    if (!req.user || req.user.id !== String(userId)) return sendError(res, 403, "You can only update your own gifts.");
    try {
      const userGift = await giftsService.markViewed(userId, param(req.params.userGiftId), req.query.language);
      if (!userGift) return sendError(res, 404, "User gift not found.");
      res.status(200).json({ success: true, userGift });
    } catch (error) {
      sendError(res, 500, error instanceof Error ? error.message : "Failed to update user gift.");
    }
  },
};
