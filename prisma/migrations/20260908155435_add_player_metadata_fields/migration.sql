-- AlterTable
ALTER TABLE "player_skins" ADD COLUMN     "description" TEXT,
ADD COLUMN     "url1" TEXT,
ADD COLUMN     "url2" TEXT;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "description" TEXT,
ADD COLUMN     "url1" TEXT,
ADD COLUMN     "url2" TEXT;
