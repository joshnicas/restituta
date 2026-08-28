-- AlterTable
ALTER TABLE "User" ADD COLUMN     "DoB" TIMESTAMP,
ADD COLUMN     "Grade" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'User';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password";
