import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { playerSkinsController, skinsUploadMiddleware } from "./player-skins.controller";

const skinsRoutes = Router();

skinsRoutes.get("/", playerSkinsController.list);
skinsRoutes.get("/:id", playerSkinsController.getById);

skinsRoutes.post(
  "/",
  (req, res, next) => skinsUploadMiddleware(req, res, next),
  playerSkinsController.create,
);

skinsRoutes.put(
  "/:id",
  (req, res, next) => skinsUploadMiddleware(req, res, next),
  playerSkinsController.update,
);

skinsRoutes.delete("/:id", requireAdmin, playerSkinsController.delete);

export default skinsRoutes;
