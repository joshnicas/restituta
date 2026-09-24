import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { audiosController } from "./audios.controller";
import { uploadAudio } from "./audio.upload";

const audiosRoutes = Router();

audiosRoutes.get("/", audiosController.list);
audiosRoutes.get("/:id", audiosController.getById);

audiosRoutes.post(
  "/",
  requireAdmin,
  (req, res, next) => {
    uploadAudio.single("audio")(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next();
    });
  },
  audiosController.create,
);

audiosRoutes.put("/:id", requireAdmin, audiosController.update);
audiosRoutes.delete("/:id", requireAdmin, audiosController.delete);

export default audiosRoutes;
