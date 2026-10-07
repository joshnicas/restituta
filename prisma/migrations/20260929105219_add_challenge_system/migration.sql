-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('DAILY', 'WEEKLY', 'SPECIAL', 'SPEED', 'PERFECT');

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChallengeType" NOT NULL,
    "gradeId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "targetQuestions" INTEGER NOT NULL DEFAULT 10,
    "timeLimit" INTEGER,
    "pointsReward" INTEGER NOT NULL DEFAULT 0,
    "starsReward" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenges_isActive_idx" ON "challenges"("isActive");

-- CreateIndex
CREATE INDEX "challenges_startsAt_endsAt_idx" ON "challenges"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "challenges_gradeId_idx" ON "challenges"("gradeId");

-- CreateIndex
CREATE INDEX "challenges_subjectId_idx" ON "challenges"("subjectId");

-- CreateIndex
CREATE INDEX "challenges_topicId_idx" ON "challenges"("topicId");

-- CreateIndex
CREATE INDEX "user_challenges_userId_idx" ON "user_challenges"("userId");

-- CreateIndex
CREATE INDEX "user_challenges_challengeId_idx" ON "user_challenges"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_challenges_userId_challengeId_key" ON "user_challenges"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
