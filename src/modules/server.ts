import express from "express";
import cors from "cors";
import path from "path";

import prisma from "../prisma";
import { pet } from "../data/pets";
import { seedDefaultAdmin } from "./admin/admin.service";
import adminRoutes from "./admin/admin.routes";
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
import imageCategoriesRoutes from "./image-categories/image-categories.routes";
import imagesRoutes from "./images/images.routes";
import playersRoutes from "./players/players.routes";
import playerSkinsRoutes from "./player-skins/player-skins.routes";
import audioCategoriesRoutes from "./audio-categories/audio-categories.routes";
import audiosRoutes from "./audios/audios.routes";
import profilesRoutes from "./profiles/profiles.routes";
import attemptsRoutes from "./attempts/attempts.routes";
import progressRoutes from "./progress/progress.routes";
import leaderboardsRoutes from "./leaderboards/leaderboards.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  "/images",
  express.static(path.resolve(__dirname, "../../storage/app/public/images")),
);
app.use(
  "/audios",
  express.static(path.resolve(__dirname, "../../storage/app/public/audios")),
);


app.get("/", (_req, res) => {
  res.json(pet);
});

app.use("/admin", adminRoutes);
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
app.use("/image-categories", imageCategoriesRoutes);
app.use("/images", imagesRoutes);
app.use("/players", playersRoutes);
app.use("/player-skins", playerSkinsRoutes);
app.use(
  "/players",
  express.static(path.resolve(__dirname, "../../storage/app/public/players")),
);
app.use(
  "/skins",
  express.static(path.resolve(__dirname, "../../storage/app/public/skins")),
);
app.use("/audio-categories", audioCategoriesRoutes);
app.use("/audios", audiosRoutes);
app.use("/profiles", profilesRoutes);
app.use("/attempts", attemptsRoutes);
app.use("/progress", progressRoutes);
app.use("/leaderboards", leaderboardsRoutes);

async function bootstrap() {
  try {
    await prisma.$connect();

    await seedDefaultAdmin();

    const port = Number(process.env.PORT ?? 8000);

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P1001") {
      console.error(
        "Server bootstrap failed: Prisma could not reach the database. Make sure Postgres is running and DATABASE_URL points to the correct host and port.",
      );
    } else {
      console.error("Server bootstrap failed:", error);
    }
    process.exit(1);
  }
}

void bootstrap();
