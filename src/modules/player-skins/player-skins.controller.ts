import type { Request, Response } from "express";

import { playerSkinsService } from "./player-skins.service";
import { parseSkinCreateBody, parseSkinUpdateBody } from "./player-skins.schema";
import { uploadSkinImages } from "./player-skins.upload";
import { cleanupMediaUrl, mediaUrl } from "../storage/media";
import { uploadedObjectPath } from "../storage/multer-storage";

type ReqWithFile = Request & { files?: { [fieldname: string]: Express.Multer.File[] } };

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
    const uploaded = Object.values(files ?? {}).flat();
    const uploadedKeys = uploaded.map((file) => uploadedObjectPath(file)).filter((key): key is string => Boolean(key));

    let payload;

    try {
      payload = parseSkinCreateBody(req.body);
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("skins", key)).catch(() => undefined)));
      const message = error instanceof Error ? error.message : "Invalid skin data.";
      sendError(res, 400, message);
      return;
    }

    if (files && files.image1 && files.image1.length > 0) {
      payload.url1 = mediaUrl("skins", uploadedObjectPath(files.image1[0])!);
    }

    if (files && files.image2 && files.image2.length > 0) {
      payload.url2 = mediaUrl("skins", uploadedObjectPath(files.image2[0])!);
    }

    try {
      const skin = await playerSkinsService.create(payload);
      res.status(201).json({ success: true, message: "Skin created successfully.", skin });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("skins", key)).catch(() => console.error("Uploaded skin image cleanup failed", { objectPath: key }))));
      sendError(res, 500, "Failed to create skin.");
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;
    const uploaded = Object.values(files ?? {}).flat();
    const uploadedKeys = uploaded.map((file) => uploadedObjectPath(file)).filter((key): key is string => Boolean(key));
    let existing: Awaited<ReturnType<typeof playerSkinsService.getById>> = null;

    let payload;

    try {
      payload = parseSkinUpdateBody(req.body);
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("skins", key)).catch(() => undefined)));
      const message = error instanceof Error ? error.message : "Invalid skin update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      existing = await playerSkinsService.getById(id);

      if (files && files.image1 && files.image1.length > 0) {
        payload.url1 = mediaUrl("skins", uploadedObjectPath(files.image1[0])!);
      }

      if (files && files.image2 && files.image2.length > 0) {
        payload.url2 = mediaUrl("skins", uploadedObjectPath(files.image2[0])!);
      }

      const skin = await playerSkinsService.update(id, payload);

      if (!skin) {
        await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("skins", key)).catch(() => undefined)));
        sendError(res, 404, "Skin not found.");
        return;
      }

      if (files?.image1?.length && existing?.url1 !== skin.url1) await cleanupMediaUrl(existing?.url1).catch(() => console.error("Old skin image cleanup failed", { url: existing?.url1 }));
      if (files?.image2?.length && existing?.url2 !== skin.url2) await cleanupMediaUrl(existing?.url2).catch(() => console.error("Old skin image cleanup failed", { url: existing?.url2 }));

      res.status(200).json({ success: true, message: "Skin updated successfully.", skin });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("skins", key)).catch(() => console.error("Uploaded skin image cleanup failed", { objectPath: key }))));
      sendError(res, 500, "Failed to update skin.");
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

      await cleanupMediaUrl(skin.url1).catch(() => console.error("Deleted skin image cleanup failed", { url: skin.url1 }));
      await cleanupMediaUrl(skin.url2).catch(() => console.error("Deleted skin image cleanup failed", { url: skin.url2 }));

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
