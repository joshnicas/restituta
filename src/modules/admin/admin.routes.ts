import { Router } from "express";

import { adminController } from "./admin.controller";
import { requireAdmin } from "./admin.middleware";

const adminRoutes = Router();
adminRoutes.post("/register", adminController.register);
adminRoutes.post("/login", adminController.login);
adminRoutes.post("/logout", requireAdmin, adminController.logout);
adminRoutes.get("/me", requireAdmin, adminController.me);
adminRoutes.get("/users", requireAdmin, adminController.listUsers);
adminRoutes.put("/users/:id", requireAdmin, adminController.updateUser);
adminRoutes.delete("/users/:id", requireAdmin, adminController.deleteUser);

export default adminRoutes;
