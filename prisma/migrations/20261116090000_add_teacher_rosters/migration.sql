CREATE TYPE "TeacherStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "territory" TEXT NOT NULL,
    "status" "TeacherStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_students" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");
CREATE INDEX "teachers_status_createdAt_idx" ON "teachers"("status", "createdAt");
CREATE INDEX "teachers_schoolCode_idx" ON "teachers"("schoolCode");
CREATE UNIQUE INDEX "teacher_students_teacherId_studentId_key" ON "teacher_students"("teacherId", "studentId");
CREATE INDEX "teacher_students_studentId_idx" ON "teacher_students"("studentId");

ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
