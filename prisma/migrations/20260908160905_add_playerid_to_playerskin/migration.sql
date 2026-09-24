-- AlterTable
ALTER TABLE "player_skins" ADD COLUMN     "playerId" INTEGER;

-- AddForeignKey
ALTER TABLE "player_skins" ADD CONSTRAINT "player_skins_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
