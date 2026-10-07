import { Router } from "express";
import { requireAdmin } from "../admin/admin.middleware";
import { giftsController } from "./gifts.controller";

const giftsRoutes = Router();
giftsRoutes.get("/", giftsController.listDefinitions);
giftsRoutes.get("/:id", giftsController.getDefinition);
giftsRoutes.post("/", requireAdmin, giftsController.createDefinition);
giftsRoutes.patch("/:id", requireAdmin, giftsController.updateDefinition);
giftsRoutes.put("/:id", requireAdmin, giftsController.updateDefinition);
giftsRoutes.delete("/:id", requireAdmin, giftsController.deleteDefinition);

export default giftsRoutes;
