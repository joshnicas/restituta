/*
  Warnings:

  - You are about to drop the column `player` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `playerSkin` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "player",
DROP COLUMN "playerSkin",
ADD COLUMN     "playerId" INTEGER,
ADD COLUMN     "playerSkinId" INTEGER;

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skins" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "player_skins_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_playerSkinId_fkey" FOREIGN KEY ("playerSkinId") REFERENCES "player_skins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
