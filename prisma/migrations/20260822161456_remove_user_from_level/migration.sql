/*
  Warnings:

  - You are about to drop the column `userId` on the `Level` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Level" DROP CONSTRAINT "Level_userId_fkey";

-- AlterTable
ALTER TABLE "Level" DROP COLUMN "userId";
