import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { subjectsController } from "./subjects.controller";

const subjectsRoutes = Router();
subjectsRoutes.get("/", subjectsController.list);
subjectsRoutes.get("/:id", subjectsController.getById);
subjectsRoutes.post("/", requireAdmin, subjectsController.create);
subjectsRoutes.put("/:id", requireAdmin, subjectsController.update);
subjectsRoutes.delete("/:id", requireAdmin, subjectsController.delete);

export default subjectsRoutes;
