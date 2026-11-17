/*
  Warnings:

  - You are about to drop the column `manualPupilId` on the `teacher_class_pupils` table. All the data in the column will be lost.
  - You are about to drop the `teacher_manual_pupils` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `studentId` on table `teacher_class_pupils` required. This step will fail if there are existing NULL values in that column.

*/
-- Remove any legacy manual-only class memberships before requiring a Kido account.
DELETE FROM "teacher_class_pupils" WHERE "studentId" IS NULL;

-- DropForeignKey
ALTER TABLE "teacher_class_pupils" DROP CONSTRAINT "teacher_class_pupils_manualPupilId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_manual_pupils" DROP CONSTRAINT "teacher_manual_pupils_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_manual_pupils" DROP CONSTRAINT "teacher_manual_pupils_teacherId_fkey";

-- Remove the original exactly-one-of-account-or-manual-pupil check.
ALTER TABLE "teacher_class_pupils" DROP CONSTRAINT "teacher_class_pupils_exactly_one_pupil_check";

-- DropIndex
DROP INDEX "teacher_class_pupils_classId_manualPupilId_key";

-- DropIndex
DROP INDEX "teacher_class_pupils_manualPupilId_idx";

-- AlterTable
ALTER TABLE "teacher_class_pupils" DROP COLUMN "manualPupilId",
ALTER COLUMN "studentId" SET NOT NULL;

-- DropTable
DROP TABLE "teacher_manual_pupils";

