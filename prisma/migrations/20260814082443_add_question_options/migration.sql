/*
  Warnings:

  - Added the required column `option1` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option2` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option3` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "option1" TEXT NOT NULL,
ADD COLUMN     "option2" TEXT NOT NULL,
ADD COLUMN     "option3" TEXT NOT NULL;
