ALTER TABLE "user_challenges"
ADD COLUMN "claimed" BOOLEAN NOT NULL DEFAULT false;

-- Prior challenge rewards were credited as answers were submitted, so preserve
-- those existing rewards in overall totals after switching to explicit claiming.
UPDATE "user_challenges"
SET "claimed" = true
WHERE "pointsEarned" > 0 OR "starsEarned" > 0;
