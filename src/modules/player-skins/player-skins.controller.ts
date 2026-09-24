import type { Request, Response } from "express";
import fs from "fs";

import { playerSkinsService } from "./player-skins.service";
import { parseSkinCreateBody, parseSkinUpdateBody } from "./player-skins.schema";
import { SKINS_STORAGE_DIR, uploadSkinImages } from "./player-skins.upload";

type ReqWithFile = Request & { files?: { [fieldname: string]: Express.Multer.File[] } };

function removeLocalFile(url: string | null | undefined): void {
  if (!url || !url.startsWith("/skins/")) return;

  const filename = url.replace("/skins/", "");
  const filePath = `${SKINS_STORAGE_DIR}/${filename}`;

  fs.promises.unlink(filePath).catch(() => {});
}

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

export const playerSkinsController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const skins = await playerSkinsService.getAll();
      res.status(200).json({ success: true, skins });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch skins.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const skin = await playerSkinsService.getById(id);

      if (!skin) {
        sendError(res, 404, "Skin not found.");
        return;
      }

      res.status(200).json({ success: true, skin });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch skin.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;

    let payload;

    try {
      payload = parseSkinCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid skin data.";
      sendError(res, 400, message);
      return;
    }

    if (files && files.image1 && files.image1.length > 0) {
      payload.url1 = `/skins/${files.image1[0].filename}`;
    }

    if (files && files.image2 && files.image2.length > 0) {
      payload.url2 = `/skins/${files.image2[0].filename}`;
    }

    try {
      const skin = await playerSkinsService.create(payload);
      res.status(201).json({ success: true, message: "Skin created successfully.", skin });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create skin.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;

    let payload;

    try {
      payload = parseSkinUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid skin update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (files && files.image1 && files.image1.length > 0) {
        payload.url1 = `/skins/${files.image1[0].filename}`;
        const existing = await playerSkinsService.getById(id);
        removeLocalFile(existing?.url1);
      }

      if (files && files.image2 && files.image2.length > 0) {
        payload.url2 = `/skins/${files.image2[0].filename}`;
        const existing = await playerSkinsService.getById(id);
        removeLocalFile(existing?.url2);
      }

      const skin = await playerSkinsService.update(id, payload);

      if (!skin) {
        sendError(res, 404, "Skin not found.");
        return;
      }

      res.status(200).json({ success: true, message: "Skin updated successfully.", skin });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update skin.";
      sendError(res, 500, message);
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const skin = await playerSkinsService.delete(id);

      if (!skin) {
        sendError(res, 404, "Skin not found.");
        return;
      }

      removeLocalFile(skin.url1);
      removeLocalFile(skin.url2);

      res.status(200).json({ success: true, message: "Skin deleted successfully.", skin });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete skin.";
      sendError(res, 500, message);
    }
  },
};

export const skinsUploadMiddleware = (req: Request, res: Response, next: Function) => {
  uploadSkinImages.fields([
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
