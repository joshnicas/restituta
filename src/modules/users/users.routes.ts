import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { usersController } from "./users.controller";
import { authController } from "../auth/auth.controller";
import { streaksController } from "../streaks/streaks.controller";

const usersRoutes = Router();

// Authentication endpoints moved under /users
usersRoutes.post("/register", authController.register);
usersRoutes.post("/login", authController.login);

// Account management
usersRoutes.get("/", usersController.getAll);
usersRoutes.get("/me", requireAuth, usersController.getMe);
usersRoutes.get("/me/streak", requireAuth, streaksController.getMe);
usersRoutes.get("/:id", requireAuth, usersController.getById);
usersRoutes.put("/account", requireAuth, authController.updateAccount);
usersRoutes.patch("/account", requireAuth, authController.updateAccount);

export default usersRoutes;
