import type { Request, Response } from "express";
import fs from "fs";

import { imagesService } from "./images.service";
import { parseImageCreateBody, parseImageUpdateBody } from "./images.schema";
import { IMAGES_STORAGE_DIR } from "./image.upload";

type RequestWithFile = Request & { file?: Express.Multer.File };

function removeLocalFile(url: string | null | undefined): void {
  if (!url || !url.startsWith("/images/")) {
    return;
  }

  const filename = url.replace("/images/", "");
  const filePath = `${IMAGES_STORAGE_DIR}/${filename}`;

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

    let payload;

    try {
      payload = parseImageCreateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid image data.";
      sendError(res, 400, message);
      return;
    }

    let url: string | null | undefined = payload.url;

    if (file) {
      url = `/images/${file.filename}`;
    }

    if (!url) {
      sendError(res, 400, "Either an image file or a url must be provided.");
      return;
    }

    try {
      const categoryExists = await imagesService.categoryExists(payload.imageCategoryId);

      if (!categoryExists) {
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
      const message = error instanceof Error ? error.message : "Failed to create image.";
      sendError(res, 500, message);
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    let payload;

    try {
      payload = parseImageUpdateBody(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid image update data.";
      sendError(res, 400, message);
      return;
    }

    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (payload.imageCategoryId !== undefined) {
        const categoryExists = await imagesService.categoryExists(payload.imageCategoryId);

        if (!categoryExists) {
          sendError(res, 400, "Image category not found.");
          return;
        }
      }

      const image = await imagesService.update(id, payload);

      if (!image) {
        sendError(res, 404, "Image not found.");
        return;
      }

      res.status(200).json({
        success: true,
        message: "Image updated successfully.",
        image,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update image.";
      sendError(res, 500, message);
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

      removeLocalFile(image.url);

      res.status(200).json({
        success: true,
        message: "Image deleted successfully.",
        image,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete image.";
      sendError(res, 500, message);
    }
  },
};
