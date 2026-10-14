ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT;
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
