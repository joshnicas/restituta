-- Add one participation per local day for daily challenges and per ISO week for weekly challenges.
ALTER TABLE "user_challenges"
ADD COLUMN "periodKey" TEXT NOT NULL DEFAULT 'LIFETIME';

DROP INDEX "user_challenges_userId_challengeId_key";

CREATE UNIQUE INDEX "user_challenges_userId_challengeId_periodKey_key"
ON "user_challenges"("userId", "challengeId", "periodKey");
