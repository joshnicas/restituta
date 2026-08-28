-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "levelId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "image" TEXT,
    "answer" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_levelId_text_key" ON "questions"("levelId", "text");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
