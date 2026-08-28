import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { gameTypesController } from "./game-types.controller";

const gameTypesRoutes = Router();
gameTypesRoutes.get("/", gameTypesController.list);
gameTypesRoutes.get("/:id", gameTypesController.getById);
gameTypesRoutes.post("/", requireAdmin, gameTypesController.create);
gameTypesRoutes.put("/:id", requireAdmin, gameTypesController.update);
gameTypesRoutes.delete("/:id", requireAdmin, gameTypesController.delete);

export default gameTypesRoutes;
