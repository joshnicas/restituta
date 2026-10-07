import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { challengesController } from "./challenges.controller";

const challengesRoutes = Router();
challengesRoutes.get("/", challengesController.list);
challengesRoutes.get("/:id", challengesController.getById);
challengesRoutes.post("/", requireAdmin, challengesController.create);
challengesRoutes.put("/:id", requireAdmin, challengesController.update);
challengesRoutes.patch("/:id", requireAdmin, challengesController.update);
challengesRoutes.delete("/:id", requireAdmin, challengesController.delete);
challengesRoutes.post("/:id/join", requireAuth, challengesController.join);

export default challengesRoutes;