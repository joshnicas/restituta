import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { levelsController } from "./levels.controller";

const levelsRoutes = Router();
levelsRoutes.get("/", levelsController.list);
levelsRoutes.get("/:id", levelsController.getById);
levelsRoutes.get("/:id/questions", levelsController.getQuestions);
levelsRoutes.post("/", requireAdmin, levelsController.create);
levelsRoutes.put("/:id", requireAdmin, levelsController.update);
levelsRoutes.delete("/:id", requireAdmin, levelsController.delete);

export default levelsRoutes;
