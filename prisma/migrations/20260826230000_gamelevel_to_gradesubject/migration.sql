-- Step 1: Add new nullable column gradeSubjectId to game_levels
ALTER TABLE "game_levels" ADD COLUMN "gradeSubjectId" INTEGER;

-- Step 2: Populate gradeSubjectId from existing gradeSubjectTopicId relationship
UPDATE "game_levels" gl
SET "gradeSubjectId" = gst."gradeSubjectId"
FROM "grade_subject_topics" gst
WHERE gl."gradeSubjectTopicId" = gst.id;

-- Step 3: Deduplicate - keep lowest id for each (gradeSubjectId, levelNumber)
-- The old schema allowed duplicates within GradeSubjectTopic, but the new schema
-- requires uniqueness within GradeSubject.
DELETE FROM game_levels
WHERE id NOT IN (
  SELECT MIN(id)
  FROM game_levels
  GROUP BY "gradeSubjectId", "levelNumber"
);

-- Step 4: Verify no NULLs before making required
-- (Should return 0 after step 2)
-- SELECT count(*) FROM "game_levels" WHERE "gradeSubjectId" IS NULL;

-- Step 5: Make gradeSubjectId required
ALTER TABLE "game_levels" ALTER COLUMN "gradeSubjectId" SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE "game_levels" ADD CONSTRAINT "game_levels_gradeSubjectId_fkey" FOREIGN KEY ("gradeSubjectId") REFERENCES "grade_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_levels_gradeSubjectTopicId_levelNumber_key') THEN
    ALTER TABLE "game_levels" DROP CONSTRAINT "game_levels_gradeSubjectTopicId_levelNumber_key";
  END IF;
END $$;

-- Step 8: Add new unique constraint
ALTER TABLE "game_levels" ADD CONSTRAINT "game_levels_gradeSubjectId_levelNumber_key" UNIQUE ("gradeSubjectId", "levelNumber");

-- Step 9: Populate topicId in questions BEFORE dropping the old column
-- Add topicId column first
ALTER TABLE "questions" ADD COLUMN "topicId" INTEGER;

-- Populate topicId from existing GameLevel -> GradeSubjectTopic -> Topic relationship
UPDATE "questions" q
SET "topicId" = gst."topicId"
FROM "game_levels" gl
JOIN "grade_subject_topics" gst ON gst.id = gl."gradeSubjectTopicId"
WHERE q."gameLevelId" = gl.id;

-- Add foreign key for topicId
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 10: Drop old foreign key constraint
ALTER TABLE "game_levels" DROP CONSTRAINT "game_levels_gradeSubjectTopicId_fkey";

-- Step 11: Drop old column
ALTER TABLE "game_levels" DROP COLUMN "gradeSubjectTopicId";
