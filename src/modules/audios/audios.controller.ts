import type { Request, Response } from "express";

import { audiosService } from "./audios.service";
import { parseAudioCreateBody, parseAudioUpdateBody } from "./audios.schema";
import { cleanupMediaUrl, mediaUrl } from "../storage/media";
import { uploadedObjectPath } from "../storage/multer-storage";

type RequestWithFile = Request & { file?: Express.Multer.File };

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const audiosController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryIdParam = req.query.categoryId;
      const categoryId =
        typeof categoryIdParam === "string" && categoryIdParam.trim() !== ""
          ? Number(categoryIdParam)
          : undefined;

      if (categoryId !== undefined && !Number.isInteger(categoryId)) {
        sendError(res, 400, "categoryId must be an integer.");
        return;
      }

      const audios = await audiosService.getAll(categoryId);
      res.status(200).json({
        success: true,
        audios,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch audios.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const audio = await audiosService.getById(id);

      if (!audio) {
        sendError(res, 404, "Audio not found.");
        return;
      }

      res.status(200).json({
        success: true,
        audio,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch audio.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const file = (req as RequestWithFile).file;
    const uploadedKey = uploadedObjectPath(file);

    let payload;

    try {
      payload = parseAudioCreateBody(req.body);
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Invalid audio data.";
      sendError(res, 400, message);
      return;
    }

    let url: string | null | undefined = payload.url;

    if (file) {
      if (uploadedKey) url = mediaUrl("audios", uploadedKey);
    }

    if (!url) {
      sendError(res, 400, "Either an audio file or a url must be provided.");
      return;
    }

    try {
      const categoryExists = await audiosService.categoryExists(payload.audioCategoryId);

      if (!categoryExists) {
        if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
        sendError(res, 400, "Audio category not found.");
        return;
      }

      const audio = await audiosService.create({
        audioCategoryId: payload.audioCategoryId,
        name: payload.name,
        url,
      });
      res.status(201).json({
        success: true,
        message: "Audio created successfully.",
        audio,
      });
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => console.error("Uploaded audio cleanup failed", { objectPath: uploadedKey }));
      sendError(res, 500, "Failed to create audio.");
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const file = (req as RequestWithFile).file;
    const uploadedKey = uploadedObjectPath(file);
    let payload;

    try {
      payload = parseAudioUpdateBody(req.body);
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Invalid audio update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (payload.audioCategoryId !== undefined) {
        const categoryExists = await audiosService.categoryExists(payload.audioCategoryId);

        if (!categoryExists) {
          if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
          sendError(res, 400, "Audio category not found.");
          return;
        }
      }

      const existing = await audiosService.getById(id);
      if (!existing) {
        if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
        sendError(res, 404, "Audio not found.");
        return;
      }
      const audio = await audiosService.update(id, {
        ...payload,
        ...(uploadedKey ? { url: mediaUrl("audios", uploadedKey) } : {}),
      });

      if (!audio) {
        if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => undefined);
        sendError(res, 404, "Audio not found.");
        return;
      }
      if (uploadedKey && existing.url !== audio.url) await cleanupMediaUrl(existing.url).catch(() => console.error("Old audio cleanup failed", { url: existing.url }));

      res.status(200).json({
        success: true,
        message: "Audio updated successfully.",
        audio,
      });
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("audios", uploadedKey)).catch(() => console.error("Uploaded audio cleanup failed", { objectPath: uploadedKey }));
      sendError(res, 500, "Failed to update audio.");
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const audio = await audiosService.delete(id);

      if (!audio) {
        sendError(res, 404, "Audio not found.");
        return;
      }

      await cleanupMediaUrl(audio.url).catch(() => console.error("Deleted audio object cleanup failed", { url: audio.url }));

      res.status(200).json({
        success: true,
        message: "Audio deleted successfully.",
        audio,
      });
    } catch (error) {
      sendError(res, 500, "Failed to delete audio.");
    }
  },
};
