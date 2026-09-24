import { Router } from "express";

import { leaderboardsController } from "./leaderboards.controller";

const leaderboardsRoutes = Router();

leaderboardsRoutes.get("/", leaderboardsController.global);
leaderboardsRoutes.get("/grades", leaderboardsController.byGrade);
leaderboardsRoutes.get("/grades/:gradeId", leaderboardsController.grade);
leaderboardsRoutes.get("/grades/:gradeId/subjects", leaderboardsController.subjectsByGrade);
leaderboardsRoutes.get("/grades/:gradeId/:subjectId", leaderboardsController.subject);

export default leaderboardsRoutes;