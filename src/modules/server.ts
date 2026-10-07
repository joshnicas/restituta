import cors from "cors";
import express from "express";
import path from "path";

import { pet } from "../data/pets";
import prisma from "../prisma";
import adminRoutes from "./admin/admin.routes";
import { seedDefaultAdmin } from "./admin/admin.service";
import attemptsRoutes from "./attempts/attempts.routes";
import audioCategoriesRoutes from "./audio-categories/audio-categories.routes";
import audiosRoutes from "./audios/audios.routes";
import challengesRoutes from "./challenges/challenges.routes";
import userChallengesRoutes from "./challenges/user-challenges.routes";
import competenciesRoutes from "./competencies/competencies.routes";
import gameTypesRoutes from "./game-types/game-types.routes";
import giftsRoutes from "./gifts/gifts.routes";
import userGiftsRoutes from "./gifts/user-gifts.routes";
import gradeSubjectsRoutes from "./grade-subjects/grade-subjects.routes";
import gradesRoutes from "./grades/grades.routes";
import imageCategoriesRoutes from "./image-categories/image-categories.routes";
import imagesRoutes from "./images/images.routes";
import leaderboardsRoutes from "./leaderboards/leaderboards.routes";
import levelsRoutes from "./levels/levels.routes";
import playerSkinsRoutes from "./player-skins/player-skins.routes";
import playersRoutes from "./players/players.routes";
import practiceRoutes from "./practice/practice.routes";
import profilesRoutes from "./profiles/profiles.routes";
import progressRoutes from "./progress/progress.routes";
import questionsRoutes from "./questions/questions.routes";
import schoolsRoutes from "./schools/schools.routes";
import subjectsRoutes from "./subjects/subjects.routes";
import themesRoutes from "./themes/themes.routes";
import topicsRoutes from "./topics/topics.routes";
import usersRoutes from "./users/users.routes";

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
app.use("/gifts", giftsRoutes);
app.use("/users", userGiftsRoutes);
app.use("/users", usersRoutes);
app.use("/schools", schoolsRoutes);
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
app.use("/practice", practiceRoutes);
app.use("/api/v1/practice", practiceRoutes);
app.use("/progress", progressRoutes);
app.use("/leaderboards", leaderboardsRoutes);
app.use("/challenges", challengesRoutes);
app.use("/user-challenges", userChallengesRoutes);

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
