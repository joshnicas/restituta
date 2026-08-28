-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "userID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profilePic" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userID_key" ON "User"("userID");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
