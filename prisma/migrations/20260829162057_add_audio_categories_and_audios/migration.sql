-- CreateTable
CREATE TABLE "audio_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audios" (
    "id" SERIAL NOT NULL,
    "audioCategoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_categories_name_key" ON "audio_categories"("name");

-- CreateIndex
CREATE INDEX "audios_audioCategoryId_idx" ON "audios"("audioCategoryId");

-- AddForeignKey
ALTER TABLE "audios" ADD CONSTRAINT "audios_audioCategoryId_fkey" FOREIGN KEY ("audioCategoryId") REFERENCES "audio_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
