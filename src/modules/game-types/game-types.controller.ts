import type { Request, Response } from "express";

import { gameTypesService } from "./game-types.service";
import { parseGameTypeCreateBody, parseGameTypeUpdateBody } from "./game-types.schema";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const gameTypesController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const gameTypes = await gameTypesService.getAll();
      res.status(200).json({
        success: true,
        gameTypes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch game types.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const gameType = await gameTypesService.getById(id);

      if (!gameType) {
        sendError(res, 404, "Game type not found.");
        return;
      }

      res.status(200).json({
        success: true,
        gameType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch game type.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseGameTypeCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid game type data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const gameType = await gameTypesService.create(payload);
      res.status(201).json({
        success: true,
        message: "Game type created successfully.",
        gameType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create game type.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseGameTypeUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid game type update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const gameType = await gameTypesService.update(id, payload);

      if (!gameType) {
        sendError(res, 404, "Game type not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Game type updated successfully.",
        gameType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update game type.";
      sendError(res, 500, message);
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const gameType = await gameTypesService.delete(id);

      if (!gameType) {
        sendError(res, 404, "Game type not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Game type deleted successfully.",
        gameType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete game type.";
      sendError(res, 500, message);
    }
  },
};
