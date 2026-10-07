CREATE TYPE "PracticeMode" AS ENUM ('QUICK', 'SUBJECT', 'MISTAKES');
CREATE TYPE "QuestionSource" AS ENUM ('LEVEL', 'PRACTICE', 'CHALLENGE');

CREATE TABLE "practice_sessions" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "mode" "PracticeMode" NOT NULL,
  "subjectId" INTEGER,
  "topicId" INTEGER,
  "questionIds" JSONB NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "pointsEarned" INTEGER NOT NULL DEFAULT 0,
  "starsEarned" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_question_attempts"
  ADD COLUMN "source" "QuestionSource" NOT NULL DEFAULT 'LEVEL',
  ADD COLUMN "practiceSessionId" TEXT;

CREATE INDEX "practice_sessions_userId_startedAt_idx" ON "practice_sessions"("userId", "startedAt");
CREATE INDEX "practice_sessions_userId_mode_idx" ON "practice_sessions"("userId", "mode");
CREATE INDEX "practice_sessions_subjectId_idx" ON "practice_sessions"("subjectId");
CREATE INDEX "practice_sessions_topicId_idx" ON "practice_sessions"("topicId");
CREATE INDEX "user_question_attempts_userId_source_idx" ON "user_question_attempts"("userId", "source");
CREATE INDEX "user_question_attempts_userId_questionId_idx" ON "user_question_attempts"("userId", "questionId");
CREATE INDEX "user_question_attempts_practiceSessionId_idx" ON "user_question_attempts"("practiceSessionId");
CREATE UNIQUE INDEX "user_question_attempts_practiceSessionId_questionId_key" ON "user_question_attempts"("practiceSessionId", "questionId");

ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "user_question_attempts_practiceSessionId_fkey"
  FOREIGN KEY ("practiceSessionId") REFERENCES "practice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;