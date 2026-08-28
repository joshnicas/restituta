import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { usersController } from "./users.controller";

const usersRoutes = Router();

usersRoutes.get("/", requireAuth, usersController.getAll);
usersRoutes.get("/me", requireAuth, usersController.getMe);
usersRoutes.get("/:id", requireAuth, usersController.getById);

export default usersRoutes;
