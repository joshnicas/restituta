import { Router } from "express";

import { authController } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.put("/account", requireAuth, authController.updateAccount);

authRoutes.patch("/account", requireAuth, authController.updateAccount);

export default authRoutes;
