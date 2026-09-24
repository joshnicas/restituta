import type { Request, Response } from "express";
import fs from "fs";

import { audiosService } from "./audios.service";
import { parseAudioCreateBody, parseAudioUpdateBody } from "./audios.schema";
import { AUDIOS_STORAGE_DIR } from "./audio.upload";

type RequestWithFile = Request & { file?: Express.Multer.File };

function removeLocalFile(url: string | null | undefined): void {
  if (!url || !url.startsWith("/audios/")) {
    return;
  }

  const filename = url.replace("/audios/", "");
  const filePath = `${AUDIOS_STORAGE_DIR}/${filename}`;

  fs.promises.unlink(filePath).catch(() => {
    /* ignore missing file */
  });
}

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

    let payload;

    try {
      payload = parseAudioCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid audio data.";
      sendError(res, 400, message);
      return;
    }

    let url: string | null | undefined = payload.url;

    if (file) {
      url = `/audios/${file.filename}`;
    }

    if (!url) {
      sendError(res, 400, "Either an audio file or a url must be provided.");
      return;
    }

    try {
      const categoryExists = await audiosService.categoryExists(payload.audioCategoryId);

      if (!categoryExists) {
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
      const message = error instanceof Error ? error.message : "Failed to create audio.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseAudioUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid audio update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (payload.audioCategoryId !== undefined) {
        const categoryExists = await audiosService.categoryExists(payload.audioCategoryId);

        if (!categoryExists) {
          sendError(res, 400, "Audio category not found.");
          return;
        }
      }

      const audio = await audiosService.update(id, payload);

      if (!audio) {
        sendError(res, 404, "Audio not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Audio updated successfully.",
        audio,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update audio.";
      sendError(res, 500, message);
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

      removeLocalFile(audio.url);

      res.status(200).json({
        success: true,
        message: "Audio deleted successfully.",
        audio,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete audio.";
      sendError(res, 500, message);
    }
  },
};
