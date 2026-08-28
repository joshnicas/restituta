import express from "express";
import cors from "cors";

import prisma from "../prisma";
import { pet } from "../data/pets";
import { seedDefaultAdmin } from "./admin/admin.service";
import adminRoutes from "./admin/admin.routes";
import authRoutes from "./auth/auth.routes";
import usersRoutes from "./users/users.routes";
import gradesRoutes from "./grades/grades.routes";
import gradeSubjectsRoutes from "./grade-subjects/grade-subjects.routes";
import gameTypesRoutes from "./game-types/game-types.routes";
import subjectsRoutes from "./subjects/subjects.routes";
import topicsRoutes from "./topics/topics.routes";
import levelsRoutes from "./levels/levels.routes";
import questionsRoutes from "./questions/questions.routes";
import competenciesRoutes from "./competencies/competencies.routes";
import themesRoutes from "./themes/themes.routes";
import profilesRoutes from "./profiles/profiles.routes";
import attemptsRoutes from "./attempts/attempts.routes";
import progressRoutes from "./progress/progress.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json(pet);
});

app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/grades", gradesRoutes);
app.use("/grade-subjects", gradeSubjectsRoutes);
app.use("/game-types", gameTypesRoutes);
app.use("/subjects", subjectsRoutes);
app.use("/topics", topicsRoutes);
app.use("/levels", levelsRoutes);
app.use("/questions", questionsRoutes);
app.use("/competencies", competenciesRoutes);
app.use("/themes", themesRoutes);
app.use("/profiles", profilesRoutes);
app.use("/attempts", attemptsRoutes);
app.use("/progress", progressRoutes);

async function bootstrap() {
  try {
    await prisma.$connect();

    await seedDefaultAdmin();

    const port = Number(process.env.PORT ?? 8000);

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server bootstrap failed:", error);
    process.exit(1);
  }
}

void bootstrap();
