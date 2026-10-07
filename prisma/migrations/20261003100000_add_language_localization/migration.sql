CREATE TYPE "Language" AS ENUM ('EN', 'SW');

ALTER TABLE "users"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'EN';

CREATE TABLE "question_translations" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_translations_questionId_language_key" ON "question_translations"("questionId", "language");
CREATE INDEX "question_translations_language_idx" ON "question_translations"("language");
ALTER TABLE "question_translations" ADD CONSTRAINT "question_translations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "question_option_translations" (
    "id" SERIAL NOT NULL,
    "questionOptionId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_option_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_option_translations_questionOptionId_language_key" ON "question_option_translations"("questionOptionId", "language");
CREATE INDEX "question_option_translations_language_idx" ON "question_option_translations"("language");
ALTER TABLE "question_option_translations" ADD CONSTRAINT "question_option_translations_questionOptionId_fkey" FOREIGN KEY ("questionOptionId") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "question_match_pair_translations" (
    "id" SERIAL NOT NULL,
    "questionMatchPairId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "leftText" TEXT,
    "rightText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_match_pair_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_match_pair_translations_questionMatchPairId_language_key" ON "question_match_pair_translations"("questionMatchPairId", "language");
CREATE INDEX "question_match_pair_translations_language_idx" ON "question_match_pair_translations"("language");
ALTER TABLE "question_match_pair_translations" ADD CONSTRAINT "question_match_pair_translations_questionMatchPairId_fkey" FOREIGN KEY ("questionMatchPairId") REFERENCES "question_match_pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "question_ordering_item_translations" (
    "id" SERIAL NOT NULL,
    "questionOrderingItemId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_ordering_item_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_ordering_item_translations_questionOrderingItemId_language_key" ON "question_ordering_item_translations"("questionOrderingItemId", "language");
CREATE INDEX "question_ordering_item_translations_language_idx" ON "question_ordering_item_translations"("language");
ALTER TABLE "question_ordering_item_translations" ADD CONSTRAINT "question_ordering_item_translations_questionOrderingItemId_fkey" FOREIGN KEY ("questionOrderingItemId") REFERENCES "question_ordering_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "challenge_translations" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "challenge_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "challenge_translations_challengeId_language_key" ON "challenge_translations"("challengeId", "language");
CREATE INDEX "challenge_translations_language_idx" ON "challenge_translations"("language");
ALTER TABLE "challenge_translations" ADD CONSTRAINT "challenge_translations_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gift_translations" (
    "id" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "gift_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gift_translations_giftId_language_key" ON "gift_translations"("giftId", "language");
CREATE INDEX "gift_translations_language_idx" ON "gift_translations"("language");
ALTER TABLE "gift_translations" ADD CONSTRAINT "gift_translations_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "gifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_accepted_answers"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'EN';
DROP INDEX IF EXISTS "question_accepted_answers_questionId_answer_key";
CREATE UNIQUE INDEX "question_accepted_answers_questionId_language_answer_key" ON "question_accepted_answers"("questionId", "language", "answer");
CREATE INDEX "question_accepted_answers_language_idx" ON "question_accepted_answers"("language");

INSERT INTO "question_translations" ("questionId", "language", "text", "explanation", "updatedAt")
SELECT "id", 'EN', "text", "explanation", CURRENT_TIMESTAMP FROM "questions";

INSERT INTO "question_option_translations" ("questionOptionId", "language", "text", "updatedAt")
SELECT "id", 'EN', "text", CURRENT_TIMESTAMP FROM "question_options" WHERE "text" IS NOT NULL;

INSERT INTO "question_match_pair_translations" ("questionMatchPairId", "language", "leftText", "rightText", "updatedAt")
SELECT "id", 'EN', "leftText", "rightText", CURRENT_TIMESTAMP FROM "question_match_pairs"
WHERE "leftText" IS NOT NULL OR "rightText" IS NOT NULL;

INSERT INTO "question_ordering_item_translations" ("questionOrderingItemId", "language", "text", "updatedAt")
SELECT "id", 'EN', "text", CURRENT_TIMESTAMP FROM "question_ordering_items" WHERE "text" IS NOT NULL;

INSERT INTO "challenge_translations" ("id", "challengeId", "language", "title", "description")
SELECT 'legacy-en-' || "id", "id", 'EN', "title", "description" FROM "challenges";

INSERT INTO "gift_translations" ("id", "giftId", "language", "name", "description")
SELECT 'legacy-en-' || "id", "id", 'EN', "name", "description" FROM "gifts";
