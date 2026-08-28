-- Create enums first
CREATE TYPE "EducationStage" AS ENUM ('PRE_PRIMARY', 'PRIMARY');

CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

CREATE TYPE "QuestionMediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- Drop old tables in dependency order
DROP TABLE IF EXISTS "questions" CASCADE;
DROP TABLE IF EXISTS "points" CASCADE;
DROP TABLE IF EXISTS "coins" CASCADE;
DROP TABLE IF EXISTS "stars" CASCADE;
DROP TABLE IF EXISTS "Level" CASCADE;
DROP TABLE IF EXISTS "Topic" CASCADE;
DROP TABLE IF EXISTS "Subject" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP,
    "endsAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_code_key" ON "curriculum_versions"("code");

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "curriculumVersionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "stage" "EducationStage" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grades_curriculumVersionId_code_key" ON "grades"("curriculumVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "grades_curriculumVersionId_level_key" ON "grades"("curriculumVersionId", "level");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateTable
CREATE TABLE "grade_subjects" (
    "id" SERIAL NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_subjects_gradeId_subjectId_key" ON "grade_subjects"("gradeId", "subjectId");

-- AddForeignKey
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_subjectId_code_key" ON "topics"("subjectId", "code");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "grade_subject_topics" (
    "id" SERIAL NOT NULL,
    "gradeSubjectId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_subject_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_subject_topics_gradeSubjectId_topicId_key" ON "grade_subject_topics"("gradeSubjectId", "topicId");

-- AddForeignKey
ALTER TABLE "grade_subject_topics" ADD CONSTRAINT "grade_subject_topics_gradeSubjectId_fkey" FOREIGN KEY ("gradeSubjectId") REFERENCES "grade_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_subject_topics" ADD CONSTRAINT "grade_subject_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "game_levels" (
    "id" SERIAL NOT NULL,
    "gradeSubjectTopicId" INTEGER NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "requiredPoints" INTEGER NOT NULL DEFAULT 0,
    "timeLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_levels_gradeSubjectTopicId_levelNumber_key" ON "game_levels"("gradeSubjectTopicId", "levelNumber");

-- AddForeignKey
ALTER TABLE "game_levels" ADD CONSTRAINT "game_levels_gradeSubjectTopicId_fkey" FOREIGN KEY ("gradeSubjectTopicId") REFERENCES "grade_subject_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "game_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_types_code_key" ON "game_types"("code");

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "userID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "DoB" TIMESTAMP,
    "gradeId" INTEGER,
    "profilePic" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_userID_key" ON "users"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "gameLevelId" INTEGER NOT NULL,
    "gameTypeId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "image" TEXT,
    "audio" TEXT,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "timeLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_gameLevelId_idx" ON "questions"("gameLevelId");

-- CreateIndex
CREATE INDEX "questions_gameTypeId_idx" ON "questions"("gameTypeId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_gameLevelId_fkey" FOREIGN KEY ("gameLevelId") REFERENCES "game_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_gameTypeId_fkey" FOREIGN KEY ("gameTypeId") REFERENCES "game_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_options" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" TEXT,
    "image" TEXT,
    "audio" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_options_questionId_order_key" ON "question_options"("questionId", "order");

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_true_false_answers" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answer" BOOLEAN NOT NULL,

    CONSTRAINT "question_true_false_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_true_false_answers_questionId_key" ON "question_true_false_answers"("questionId");

-- AddForeignKey
ALTER TABLE "question_true_false_answers" ADD CONSTRAINT "question_true_false_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_match_pairs" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "leftText" TEXT,
    "leftImage" TEXT,
    "rightText" TEXT,
    "rightImage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_match_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_match_pairs_questionId_order_key" ON "question_match_pairs"("questionId", "order");

-- AddForeignKey
ALTER TABLE "question_match_pairs" ADD CONSTRAINT "question_match_pairs_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_ordering_items" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" TEXT,
    "image" TEXT,
    "correctOrder" INTEGER NOT NULL,

    CONSTRAINT "question_ordering_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_ordering_items_questionId_correctOrder_key" ON "question_ordering_items"("questionId", "correctOrder");

-- AddForeignKey
ALTER TABLE "question_ordering_items" ADD CONSTRAINT "question_ordering_items_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_accepted_answers" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "isCaseSensitive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_accepted_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_accepted_answers_questionId_answer_key" ON "question_accepted_answers"("questionId", "answer");

-- AddForeignKey
ALTER TABLE "question_accepted_answers" ADD CONSTRAINT "question_accepted_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_media" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "type" "QuestionMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_media_questionId_type_order_key" ON "question_media"("questionId", "type", "order");

-- AddForeignKey
ALTER TABLE "question_media" ADD CONSTRAINT "question_media_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "competencies" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competencies_topicId_code_key" ON "competencies"("topicId", "code");

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "question_competencies" (
    "questionId" INTEGER NOT NULL,
    "competencyId" INTEGER NOT NULL,

    CONSTRAINT "question_competencies_pkey" PRIMARY KEY ("questionId", "competencyId")
);

-- AddForeignKey
ALTER TABLE "question_competencies" ADD CONSTRAINT "question_competencies_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_competencies" ADD CONSTRAINT "question_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "cross_cutting_themes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_cutting_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cross_cutting_themes_code_key" ON "cross_cutting_themes"("code");

-- CreateTable
CREATE TABLE "question_themes" (
    "questionId" INTEGER NOT NULL,
    "themeId" INTEGER NOT NULL,

    CONSTRAINT "question_themes_pkey" PRIMARY KEY ("questionId", "themeId")
);

-- AddForeignKey
ALTER TABLE "question_themes" ADD CONSTRAINT "question_themes_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_themes" ADD CONSTRAINT "question_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "cross_cutting_themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_game_profiles" (
    "userId" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_game_profiles_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_game_profiles" ADD CONSTRAINT "user_game_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_question_attempts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "timeTaken" INTEGER,
    "answerData" JSONB,
    "attemptedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_question_attempts_userId_attemptedAt_idx" ON "user_question_attempts"("userId", "attemptedAt");

-- CreateIndex
CREATE INDEX "user_question_attempts_questionId_idx" ON "user_question_attempts"("questionId");

-- AddForeignKey
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "user_question_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "user_question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_level_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gradeId" INTEGER,
    "gameLevelId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_level_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_level_progress_userId_gameLevelId_key" ON "user_level_progress"("userId", "gameLevelId");

-- AddForeignKey
ALTER TABLE "user_level_progress" ADD CONSTRAINT "user_level_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_level_progress" ADD CONSTRAINT "user_level_progress_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_level_progress" ADD CONSTRAINT "user_level_progress_gameLevelId_fkey" FOREIGN KEY ("gameLevelId") REFERENCES "game_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
