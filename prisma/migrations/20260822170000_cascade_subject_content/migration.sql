-- Deleting a subject removes its complete content tree: topics, levels,
-- questions, and point records associated with those topics/levels.
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_subjectId_fkey";
ALTER TABLE "Topic"
  ADD CONSTRAINT "Topic_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Level" DROP CONSTRAINT "Level_topicId_fkey";
ALTER TABLE "Level"
  ADD CONSTRAINT "Level_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "questions" DROP CONSTRAINT "questions_levelId_fkey";
ALTER TABLE "questions"
  ADD CONSTRAINT "questions_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points" DROP CONSTRAINT "points_topicId_fkey";
ALTER TABLE "points"
  ADD CONSTRAINT "points_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points" DROP CONSTRAINT "points_levelId_fkey";
ALTER TABLE "points"
  ADD CONSTRAINT "points_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;
