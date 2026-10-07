import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { practiceController } from "./practice.controller";

const practiceRoutes = Router();
practiceRoutes.use(requireAuth);
practiceRoutes.get("/", practiceController.home);
practiceRoutes.get("/subjects/:subjectId", practiceController.subject);
practiceRoutes.post("/start", practiceController.start);
practiceRoutes.get("/:sessionId", practiceController.getSession);
practiceRoutes.post("/:sessionId/answer", practiceController.answer);
practiceRoutes.post("/:sessionId/complete", practiceController.complete);

export default practiceRoutes;