import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { audioCategoriesController } from "./audio-categories.controller";

const audioCategoriesRoutes = Router();
audioCategoriesRoutes.get("/", audioCategoriesController.list);
audioCategoriesRoutes.get("/:id", audioCategoriesController.getById);
audioCategoriesRoutes.post("/", requireAdmin, audioCategoriesController.create);
audioCategoriesRoutes.put("/:id", requireAdmin, audioCategoriesController.update);
audioCategoriesRoutes.delete("/:id", requireAdmin, audioCategoriesController.delete);

export default audioCategoriesRoutes;
