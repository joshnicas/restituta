import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { topicsController } from "./topics.controller";

const topicsRoutes = Router();
topicsRoutes.get("/", topicsController.list);
topicsRoutes.get("/:id", topicsController.getById);
topicsRoutes.get("/:id/questions", topicsController.getQuestions);
topicsRoutes.post("/", requireAdmin, topicsController.create);
topicsRoutes.put("/:id", requireAdmin, topicsController.update);
topicsRoutes.delete("/:id", requireAdmin, topicsController.delete);

export default topicsRoutes;
