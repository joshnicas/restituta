import type { Request, Response } from "express";

import { playersService } from "./players.service";
import { parsePlayerCreateBody, parsePlayerUpdateBody } from "./players.schema";
import { uploadPlayerImages } from "./players.upload";
import { cleanupMediaUrl, mediaUrl } from "../storage/media";
import { uploadedObjectPath } from "../storage/multer-storage";

type ReqWithFile = Request & { files?: { [fieldname: string]: Express.Multer.File[] } };

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
    const uploaded = Object.values(files ?? {}).flat();
    const uploadedKeys = uploaded.map((file) => uploadedObjectPath(file)).filter((key): key is string => Boolean(key));

    let payload;

    try {
      payload = parsePlayerCreateBody(req.body);
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("players", key)).catch(() => undefined)));
      const message = error instanceof Error ? error.message : "Invalid player data.";
      sendError(res, 400, message);
      return;
    }

    // handle uploaded image fields: image1, image2
    if (files && files.image1 && files.image1.length > 0) {
      payload.url1 = mediaUrl("players", uploadedObjectPath(files.image1[0])!);
    }

    if (files && files.image2 && files.image2.length > 0) {
      payload.url2 = mediaUrl("players", uploadedObjectPath(files.image2[0])!);
    }

    if (!payload.url1 && !payload.url2) {
      // allow creation without images but at least one URL recommended; not enforcing here
    }

    try {
      const player = await playersService.create(payload);
      res.status(201).json({ success: true, message: "Player created successfully.", player });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("players", key)).catch(() => console.error("Uploaded player image cleanup failed", { objectPath: key }))));
      sendError(res, 500, "Failed to create player.");
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const files = (req as ReqWithFile).files;
    const uploaded = Object.values(files ?? {}).flat();
    const uploadedKeys = uploaded.map((file) => uploadedObjectPath(file)).filter((key): key is string => Boolean(key));
    let existing: Awaited<ReturnType<typeof playersService.getById>> = null;

    let payload;

    try {
      payload = parsePlayerUpdateBody(req.body);
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("players", key)).catch(() => undefined)));
      const message = error instanceof Error ? error.message : "Invalid player update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      existing = await playersService.getById(id);
      if (files && files.image1 && files.image1.length > 0) {
        payload.url1 = mediaUrl("players", uploadedObjectPath(files.image1[0])!);
      }

      if (files && files.image2 && files.image2.length > 0) {
        payload.url2 = mediaUrl("players", uploadedObjectPath(files.image2[0])!);
      }

      const player = await playersService.update(id, payload);

      if (!player) {
        await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("players", key)).catch(() => undefined)));
        sendError(res, 404, "Player not found.");
        return;
      }

      if (files?.image1?.length && existing?.url1 !== player.url1) await cleanupMediaUrl(existing?.url1).catch(() => console.error("Old player image cleanup failed", { url: existing?.url1 }));
      if (files?.image2?.length && existing?.url2 !== player.url2) await cleanupMediaUrl(existing?.url2).catch(() => console.error("Old player image cleanup failed", { url: existing?.url2 }));

      res.status(200).json({ success: true, message: "Player updated successfully.", player });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => cleanupMediaUrl(mediaUrl("players", key)).catch(() => console.error("Uploaded player image cleanup failed", { objectPath: key }))));
      sendError(res, 500, "Failed to update player.");
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
      await cleanupMediaUrl(player.url1).catch(() => console.error("Deleted player image cleanup failed", { url: player.url1 }));
      await cleanupMediaUrl(player.url2).catch(() => console.error("Deleted player image cleanup failed", { url: player.url2 }));

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
