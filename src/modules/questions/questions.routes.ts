import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { questionsController } from "./questions.controller";

const questionsRoutes = Router();
questionsRoutes.get("/", questionsController.list);
questionsRoutes.get("/:id", questionsController.getById);
questionsRoutes.post("/", requireAdmin, questionsController.create);
questionsRoutes.put("/batch", requireAdmin, questionsController.batchUpdate);
questionsRoutes.put("/:id", requireAdmin, questionsController.update);
questionsRoutes.delete("/:id", requireAdmin, questionsController.delete);

export default questionsRoutes;
