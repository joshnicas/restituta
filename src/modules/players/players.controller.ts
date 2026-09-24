import type { Request, Response } from "express";
import fs from "fs";

import { playersService } from "./players.service";
import { parsePlayerCreateBody, parsePlayerUpdateBody } from "./players.schema";
import { PLAYERS_STORAGE_DIR, uploadPlayerImages } from "./players.upload";

type ReqWithFile = Request & { files?: { [fieldname: string]: Express.Multer.File[] } };

function removeLocalFile(url: string | null | undefined): void {
  if (!url || !url.startsWith("/players/")) return;

  const filename = url.replace("/players/", "");
  const filePath = `${PLAYERS_STORAGE_DIR}/${filename}`;

  fs.promises.unlink(filePath).catch(() => {});
}

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

export const playersController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const players = await playersService.getAll();
      res.status(200).json({ success: true, players });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch players.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const player = await playersService.getById(id);

      if (!player) {
        sendError(res, 404, "Player not found.");
        return;
      }

      res.status(200).json({ success: true, player });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch player.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;

    let payload;

    try {
      payload = parsePlayerCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid player data.";
      sendError(res, 400, message);
      return;
    }

    // handle uploaded image fields: image1, image2
    if (files && files.image1 && files.image1.length > 0) {
      payload.url1 = `/players/${files.image1[0].filename}`;
    }

    if (files && files.image2 && files.image2.length > 0) {
      payload.url2 = `/players/${files.image2[0].filename}`;
    }

    if (!payload.url1 && !payload.url2) {
      // allow creation without images but at least one URL recommended; not enforcing here
    }

    try {
      const player = await playersService.create(payload);
      res.status(201).json({ success: true, message: "Player created successfully.", player });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create player.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;

    let payload;

    try {
      payload = parsePlayerUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid player update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // if new files provided, set URLs and remove old local files
      if (files && files.image1 && files.image1.length > 0) {
        payload.url1 = `/players/${files.image1[0].filename}`;
        const existing = await playersService.getById(id);
        removeLocalFile(existing?.url1);
      }

      if (files && files.image2 && files.image2.length > 0) {
        payload.url2 = `/players/${files.image2[0].filename}`;
        const existing = await playersService.getById(id);
        removeLocalFile(existing?.url2);
      }

      const player = await playersService.update(id, payload);

      if (!player) {
        sendError(res, 404, "Player not found.");
        return;
      }

      res.status(200).json({ success: true, message: "Player updated successfully.", player });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update player.";
      sendError(res, 500, message);
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const player = await playersService.delete(id);

      if (!player) {
        sendError(res, 404, "Player not found.");
        return;
      }

      // remove local files if present
      removeLocalFile(player.url1);
      removeLocalFile(player.url2);

      res.status(200).json({ success: true, message: "Player deleted successfully.", player });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete player.";
      sendError(res, 500, message);
    }
  },
};

// export middleware helper to accept image1 and image2
export const playersUploadMiddleware = (req: Request, res: Response, next: Function) => {
  uploadPlayerImages.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
  ])(req as any, res as any, (err: any) => {
    if (err) {
      const message = err instanceof Error ? err.message : String(err);
      (res as Response).status(400).json({ success: false, message });
      return;
    }
    next();
  });
};
