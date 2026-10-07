CREATE TABLE "user_reward_ledger" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "xpDelta" INTEGER NOT NULL DEFAULT 0,
  "starsDelta" INTEGER NOT NULL DEFAULT 0,
  "gradeId" INTEGER,
  "subjectId" INTEGER,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_reward_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_reward_ledger_sourceType_sourceId_key" ON "user_reward_ledger"("sourceType", "sourceId");
CREATE INDEX "user_reward_ledger_userId_earnedAt_idx" ON "user_reward_ledger"("userId", "earnedAt");
CREATE INDEX "user_reward_ledger_earnedAt_idx" ON "user_reward_ledger"("earnedAt");
CREATE INDEX "user_reward_ledger_gradeId_subjectId_earnedAt_idx" ON "user_reward_ledger"("gradeId", "subjectId", "earnedAt");

ALTER TABLE "user_reward_ledger" ADD CONSTRAINT "user_reward_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill historical reward sources. Completed level progress is represented
-- as one event because prior passes were not individually timestamped.
INSERT INTO "user_reward_ledger" ("userId", "sourceType", "sourceId", "xpDelta", "starsDelta", "gradeId", "subjectId", "earnedAt")
SELECT attempt."userId", 'ATTEMPT', attempt."id"::text, attempt."pointsEarned", 0,
       grade_subject."gradeId", grade_subject."subjectId", attempt."attemptedAt"
FROM "user_question_attempts" attempt
JOIN "questions" question ON question."id" = attempt."questionId"
JOIN "game_levels" level ON level."id" = question."gameLevelId"
JOIN "grade_subjects" grade_subject ON grade_subject."id" = level."gradeSubjectId"
WHERE attempt."pointsEarned" > 0;

INSERT INTO "user_reward_ledger" ("userId", "sourceType", "sourceId", "xpDelta", "starsDelta", "gradeId", "subjectId", "earnedAt")
SELECT progress."userId", 'LEVEL_PASS', progress."id"::text, progress."bestScore", progress."stars",
       COALESCE(progress."gradeId", grade_subject."gradeId"), grade_subject."subjectId",
       COALESCE(progress."completedAt", progress."updatedAt")
FROM "user_level_progress" progress
JOIN "game_levels" level ON level."id" = progress."gameLevelId"
JOIN "grade_subjects" grade_subject ON grade_subject."id" = level."gradeSubjectId"
WHERE progress."completed" = true AND (progress."bestScore" > 0 OR progress."stars" > 0);

INSERT INTO "user_reward_ledger" ("userId", "sourceType", "sourceId", "xpDelta", "starsDelta", "gradeId", "subjectId", "earnedAt")
SELECT app_user."id", 'CHALLENGE', participation."id", participation."pointsEarned", participation."starsEarned",
       COALESCE(
         CASE WHEN challenge."gradeId" ~ '^[0-9]+$' THEN challenge."gradeId"::integer END,
         app_user."gradeId"
       ),
       CASE WHEN challenge."subjectId" ~ '^[0-9]+$' THEN challenge."subjectId"::integer END,
       COALESCE(participation."completedAt", participation."updatedAt")
FROM "user_challenges" participation
JOIN "users" app_user ON app_user."userID" = participation."userId"
JOIN "challenges" challenge ON challenge."id" = participation."challengeId"
WHERE participation."claimed" = true AND (participation."pointsEarned" > 0 OR participation."starsEarned" > 0);

INSERT INTO "user_reward_ledger" ("userId", "sourceType", "sourceId", "xpDelta", "starsDelta", "gradeId", "subjectId", "earnedAt")
SELECT user_gift."userId", 'GIFT', user_gift."id", gift."pointsAwarded", gift."starsAwarded",
       app_user."gradeId", NULL, user_gift."awardedAt"
FROM "user_gifts" user_gift
JOIN "users" app_user ON app_user."id" = user_gift."userId"
JOIN "gifts" gift ON gift."id" = user_gift."giftId"
WHERE gift."pointsAwarded" > 0 OR gift."starsAwarded" > 0;
