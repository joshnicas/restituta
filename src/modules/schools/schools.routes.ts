import { Router } from "express";
import { schoolsController } from "./schools.controller";

const schoolsRoutes = Router();
schoolsRoutes.get("/regions", schoolsController.regions);
schoolsRoutes.get("/districts", schoolsController.districts);
schoolsRoutes.get("/", schoolsController.list);
schoolsRoutes.get("/:schoolCode", schoolsController.byCode);
export default schoolsRoutes;
