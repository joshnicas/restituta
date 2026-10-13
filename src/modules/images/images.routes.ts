import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { imagesController } from "./images.controller";
import { uploadImage } from "./image.upload";

const imagesRoutes = Router();

function parseUploadedImage(req: Request, res: Response, next: NextFunction): void {
  uploadImage.single("image")(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    next();
  });
}

imagesRoutes.get("/", imagesController.list);
imagesRoutes.get("/:id", imagesController.getById);

imagesRoutes.post(
  "/",
  requireAdmin,
  parseUploadedImage,
  imagesController.create,
);

imagesRoutes.put("/:id", requireAdmin, parseUploadedImage, imagesController.update);
imagesRoutes.delete("/:id", requireAdmin, imagesController.delete);

export default imagesRoutes;
