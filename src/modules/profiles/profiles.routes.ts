import { Router } from "express";

import { profilesController } from "./profiles.controller";

const profilesRoutes = Router();

// Public endpoints for profiles
profilesRoutes.get("/", profilesController.list);
profilesRoutes.get("/me", profilesController.getMe);
profilesRoutes.post("/", profilesController.create);
profilesRoutes.patch("/:id", profilesController.updateById);
profilesRoutes.delete("/:id", profilesController.deleteById);

export default profilesRoutes;
