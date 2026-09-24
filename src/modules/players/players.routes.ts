import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { playersController, playersUploadMiddleware } from "./players.controller";

const playersRoutes = Router();

playersRoutes.get("/", playersController.list);
playersRoutes.get("/:id", playersController.getById);

playersRoutes.post(
  "/",
  (req, res, next) => playersUploadMiddleware(req, res, next),
  playersController.create,
);

playersRoutes.put(
  "/:id",
  (req, res, next) => playersUploadMiddleware(req, res, next),
  playersController.update,
);

playersRoutes.delete("/:id", requireAdmin, playersController.delete);

export default playersRoutes;
