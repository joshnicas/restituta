import { Router } from "express";
import express from "express";
import { subscriptionsController } from "./subscriptions.controller";
const routes = Router();
routes.post("/", express.raw({ type: "application/json", limit: "64kb" }), subscriptionsController.webhook);
export default routes;
