-- Rename the progress score field without losing existing player progress.
ALTER TABLE "user_level_progress" RENAME COLUMN "score" TO "px";