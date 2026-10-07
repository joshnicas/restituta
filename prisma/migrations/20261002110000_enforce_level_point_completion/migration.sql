UPDATE "user_level_progress" AS progress
SET
  "completed" = (progress."attempts" > 0 AND progress."bestScore" >= level."requiredPoints"),
  "completedAt" = CASE
    WHEN progress."attempts" > 0 AND progress."bestScore" >= level."requiredPoints"
      THEN COALESCE(progress."completedAt", progress."updatedAt")
    ELSE NULL
  END
FROM "game_levels" AS level
WHERE progress."gameLevelId" = level."id";
