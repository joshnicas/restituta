import { Router } from "express";

import { requireAdmin } from "../admin/admin.middleware";
import { gradesController } from "./grades.controller";

const gradesRoutes = Router();
gradesRoutes.get("/", gradesController.list);
gradesRoutes.get("/:id", gradesController.getById);
gradesRoutes.get("/:gradeId/subjects", gradesController.getSubjects);
gradesRoutes.post("/", requireAdmin, gradesController.create);
gradesRoutes.put("/:id", requireAdmin, gradesController.update);
gradesRoutes.delete("/:id", requireAdmin, gradesController.delete);

export default gradesRoutes;
