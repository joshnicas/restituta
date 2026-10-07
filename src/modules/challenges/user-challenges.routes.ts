import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { userChallengesController } from "./user-challenges.controller";

const userChallengesRoutes = Router();
userChallengesRoutes.get("/", requireAuth, userChallengesController.list);
userChallengesRoutes.patch("/:id/progress", requireAuth, userChallengesController.updateProgress);
userChallengesRoutes.post("/:id/claim", requireAuth, userChallengesController.claimRewards);

export default userChallengesRoutes;