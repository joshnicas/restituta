import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { imagesController } from "./images.controller";
import { uploadImage } from "./image.upload";

const imagesRoutes = Router();

imagesRoutes.get("/", imagesController.list);
imagesRoutes.get("/:id", imagesController.getById);

imagesRoutes.post(
  "/",
  requireAdmin,
  (req, res, next) => {
    uploadImage.single("image")(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next();
    });
  },
  imagesController.create,
);

imagesRoutes.put("/:id", requireAdmin, imagesController.update);
imagesRoutes.delete("/:id", requireAdmin, imagesController.delete);

export default imagesRoutes;
