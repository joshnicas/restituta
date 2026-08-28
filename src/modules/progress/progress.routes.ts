import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { progressController } from "./progress.controller";

const progressRoutes = Router();
progressRoutes.get("/", requireAuth, progressController.list);
progressRoutes.post("/", requireAuth, progressController.create);
progressRoutes.put("/:levelId", requireAuth, progressController.update);
progressRoutes.patch("/:levelId", requireAuth, progressController.update);

export default progressRoutes;
