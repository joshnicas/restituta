import { Router } from "express";

import { gradeSubjectsController } from "./grade-subjects.controller";

const gradeSubjectsRoutes = Router();
gradeSubjectsRoutes.get("/:id", gradeSubjectsController.getById);
gradeSubjectsRoutes.get("/:id/topics", gradeSubjectsController.getTopics);
gradeSubjectsRoutes.get("/:id/levels", gradeSubjectsController.getLevels);

export default gradeSubjectsRoutes;
