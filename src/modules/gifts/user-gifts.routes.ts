import { Router } from "express";
import { requireAdmin } from "../admin/admin.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { giftsController } from "./gifts.controller";

const userGiftsRoutes = Router();
userGiftsRoutes.post("/:userId/gifts", requireAdmin, giftsController.award);
userGiftsRoutes.get("/:userId/gifts", requireAuth, giftsController.listUserGifts);
userGiftsRoutes.get("/:userId/gifts/:userGiftId", requireAuth, giftsController.getUserGift);
userGiftsRoutes.patch("/:userId/gifts/:userGiftId/view", requireAuth, giftsController.markViewed);

export default userGiftsRoutes;
