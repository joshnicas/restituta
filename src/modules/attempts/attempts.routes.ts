import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { attemptsController } from "./attempts.controller";

const attemptsRoutes = Router();
attemptsRoutes.post("/", requireAuth, attemptsController.create);
attemptsRoutes.get("/", requireAuth, attemptsController.list);

export default attemptsRoutes;
