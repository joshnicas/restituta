import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { competenciesController } from "./competencies.controller";

const competenciesRoutes = Router();
competenciesRoutes.get("/", competenciesController.list);
competenciesRoutes.get("/:id", competenciesController.getById);
competenciesRoutes.post("/", requireAdmin, competenciesController.create);
competenciesRoutes.put("/:id", requireAdmin, competenciesController.update);
competenciesRoutes.delete("/:id", requireAdmin, competenciesController.delete);

export default competenciesRoutes;
