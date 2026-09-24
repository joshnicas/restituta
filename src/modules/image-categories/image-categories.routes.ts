import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { imageCategoriesController } from "./image-categories.controller";

const imageCategoriesRoutes = Router();
imageCategoriesRoutes.get("/", imageCategoriesController.list);
imageCategoriesRoutes.get("/:id", imageCategoriesController.getById);
imageCategoriesRoutes.post("/", requireAdmin, imageCategoriesController.create);
imageCategoriesRoutes.put("/:id", requireAdmin, imageCategoriesController.update);
imageCategoriesRoutes.delete("/:id", requireAdmin, imageCategoriesController.delete);

export default imageCategoriesRoutes;
