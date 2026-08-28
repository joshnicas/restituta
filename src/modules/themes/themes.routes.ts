import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { themesController } from "./themes.controller";

const themesRoutes = Router();
themesRoutes.get("/", themesController.list);
themesRoutes.get("/:id", themesController.getById);
themesRoutes.post("/", requireAdmin, themesController.create);
themesRoutes.put("/:id", requireAdmin, themesController.update);
themesRoutes.delete("/:id", requireAdmin, themesController.delete);

export default themesRoutes;
