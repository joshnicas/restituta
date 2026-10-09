import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { usersController } from "./users.controller";
import { authController } from "../auth/auth.controller";
import { streaksController } from "../streaks/streaks.controller";

const usersRoutes = Router();

// Authentication endpoints moved under /users
usersRoutes.post("/register", authController.register);
usersRoutes.post("/login", authController.login);
usersRoutes.post("/refresh", authController.refresh);
usersRoutes.post("/logout", authController.logout);

// Account management
usersRoutes.get("/", usersController.getAll);
usersRoutes.get("/me", requireAuth, usersController.getMe);
usersRoutes.patch("/me/language", requireAuth, usersController.updateLanguage);
usersRoutes.get("/me/streak", requireAuth, streaksController.getMe);
usersRoutes.get("/me/lives", requireAuth, streaksController.getLives);
usersRoutes.get("/:id", requireAuth, usersController.getById);
usersRoutes.put("/account", requireAuth, authController.updateAccount);
usersRoutes.patch("/account", requireAuth, authController.updateAccount);

export default usersRoutes;
