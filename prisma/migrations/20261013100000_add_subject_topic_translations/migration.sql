CREATE TABLE "subject_translations" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subject_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subject_translations_subjectId_language_key" ON "subject_translations"("subjectId", "language");
ALTER TABLE "subject_translations" ADD CONSTRAINT "subject_translations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "topic_translations" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "topic_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "topic_translations_topicId_language_key" ON "topic_translations"("topicId", "language");
ALTER TABLE "topic_translations" ADD CONSTRAINT "topic_translations_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
