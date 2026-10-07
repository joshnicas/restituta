CREATE TABLE "gifts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "starsAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_gifts" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "giftId" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isViewed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_gifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gifts_type_idx" ON "gifts"("type");
CREATE INDEX "user_gifts_userId_awardedAt_idx" ON "user_gifts"("userId", "awardedAt");
CREATE INDEX "user_gifts_giftId_idx" ON "user_gifts"("giftId");
ALTER TABLE "user_gifts" ADD CONSTRAINT "user_gifts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_gifts" ADD CONSTRAINT "user_gifts_giftId_fkey"
  FOREIGN KEY ("giftId") REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
