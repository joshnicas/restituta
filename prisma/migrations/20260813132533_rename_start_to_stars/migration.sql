/*
  Warnings:

  - You are about to drop the `starts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "starts" DROP CONSTRAINT "starts_userId_fkey";

-- DropTable
DROP TABLE "starts";

-- CreateTable
CREATE TABLE "stars" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stars_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stars" ADD CONSTRAINT "stars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
