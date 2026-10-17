import type { Request, Response } from "express";

import { imagesService } from "./images.service";
import { parseImageCreateBody, parseImageUpdateBody, type ImageUpdateBody } from "./images.schema";
import { cleanupMediaUrl, mediaUrl } from "../storage/media";
import { uploadedObjectPath } from "../storage/multer-storage";

type RequestWithFile = Request & { file?: Express.Multer.File };

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    message,
  });
}

export const imagesController = {
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

      const images = await imagesService.getAll(categoryId);
      res.status(200).json({
        success: true,
        images,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch images.";
      sendError(res, 500, message);
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const image = await imagesService.getById(id);

      if (!image) {
        sendError(res, 404, "Image not found.");
        return;
      }

      res.status(200).json({
        success: true,
        image,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch image.";
      sendError(res, 500, message);
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const file = (req as RequestWithFile).file;
    const uploadedKey = uploadedObjectPath(file);

    let payload;

    try {
      payload = parseImageCreateBody(req.body);
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Invalid image data.";
      sendError(res, 400, message);
      return;
    }

    let url: string | null | undefined = payload.url;

    if (file && uploadedKey) {
      url = mediaUrl("images", uploadedKey);
    }

    if (!url) {
      sendError(res, 400, "Either an image file or a url must be provided.");
      return;
    }

    try {
      const categoryExists = await imagesService.categoryExists(payload.imageCategoryId);

      if (!categoryExists) {
        if (uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
        sendError(res, 400, "Image category not found.");
        return;
      }

      const image = await imagesService.create({
        imageCategoryId: payload.imageCategoryId,
        name: payload.name,
        url,
      });
      res.status(201).json({
        success: true,
        message: "Image created successfully.",
        image,
      });
    } catch (error) {
      if (uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => console.error("Uploaded image cleanup failed", { objectPath: uploadedKey }));
      sendError(res, 500, "Failed to create image.");
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const file = (req as RequestWithFile).file;
    const uploadedKey = uploadedObjectPath(file);
    let payload: ImageUpdateBody;

    try {
      payload = parseImageUpdateBody(req.body);
    } catch (error) {
      if (file && uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Invalid image update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const existing = await imagesService.getById(id);
      if (!existing) {
        if (file && uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
        sendError(res, 404, "Image not found.");
        return;
      }

      if (payload.imageCategoryId !== undefined) {
        const categoryExists = await imagesService.categoryExists(payload.imageCategoryId);

        if (!categoryExists) {
          if (file && uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
          sendError(res, 400, "Image category not found.");
          return;
        }
      }

      const image = await imagesService.update(id, {
        ...payload,
        ...(file && uploadedKey ? { url: mediaUrl("images", uploadedKey) } : {}),
      });

      if (!image) {
        if (file && uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => undefined);
        sendError(res, 404, "Image not found.");
        return;
      }

      if (file && existing.url !== image.url) await cleanupMediaUrl(existing.url).catch(() => console.error("Old image cleanup failed", { url: existing.url }));

      res.status(200).json({
        success: true,
        message: "Image updated successfully.",
        image,
      });
    } catch (error) {
      if (file && uploadedKey) await cleanupMediaUrl(mediaUrl("images", uploadedKey)).catch(() => console.error("Uploaded image cleanup failed", { objectPath: uploadedKey }));
      console.error("Image update failed after request validation");
      sendError(res, 500, "Failed to update image.");
    }
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const image = await imagesService.delete(id);

      if (!image) {
        sendError(res, 404, "Image not found.");
        return;
      }

      await cleanupMediaUrl(image.url).catch(() => console.error("Deleted image object cleanup failed", { url: image.url }));

      res.status(200).json({
        success: true,
        message: "Image deleted successfully.",
        image,
      });
    } catch (error) {
      sendError(res, 500, "Failed to delete image.");
    }
  },
};
