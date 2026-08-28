import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { profilesController } from "./profiles.controller";

const profilesRoutes = Router();
profilesRoutes.get("/me", requireAuth, profilesController.getMe);
profilesRoutes.put("/me", requireAuth, profilesController.updateMe);
profilesRoutes.patch("/me", requireAuth, profilesController.updateMe);

export default profilesRoutes;
