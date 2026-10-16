CREATE TYPE "SongMediaType" AS ENUM ('AUDIO', 'VIDEO');

CREATE TABLE "songs" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "mediaType" "SongMediaType" NOT NULL DEFAULT 'VIDEO',
    "url" TEXT NOT NULL,
    "duration" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "songs_active_sortOrder_idx" ON "songs"("active", "sortOrder");

INSERT INTO "songs" ("title", "subtitle", "mediaType", "url", "duration", "sortOrder", "active", "updatedAt")
VALUES ('Morning Beat', 'Start your day', 'VIDEO', '/songs/morning-beat.mp4', '1:42', 0, true, CURRENT_TIMESTAMP);
