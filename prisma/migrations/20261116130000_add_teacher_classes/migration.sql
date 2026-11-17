CREATE TABLE "teacher_classes" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_manual_pupils" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "schoolName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_manual_pupils_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_class_pupils" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" INTEGER,
    "manualPupilId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_class_pupils_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teacher_class_pupils_exactly_one_pupil_check"
      CHECK (("studentId" IS NOT NULL)::integer + ("manualPupilId" IS NOT NULL)::integer = 1)
);

CREATE INDEX "teacher_classes_teacherId_name_idx" ON "teacher_classes"("teacherId", "name");
CREATE INDEX "teacher_manual_pupils_teacherId_name_idx" ON "teacher_manual_pupils"("teacherId", "name");
CREATE UNIQUE INDEX "teacher_class_pupils_classId_studentId_key" ON "teacher_class_pupils"("classId", "studentId");
CREATE UNIQUE INDEX "teacher_class_pupils_classId_manualPupilId_key" ON "teacher_class_pupils"("classId", "manualPupilId");
CREATE INDEX "teacher_class_pupils_studentId_idx" ON "teacher_class_pupils"("studentId");
CREATE INDEX "teacher_class_pupils_manualPupilId_idx" ON "teacher_class_pupils"("manualPupilId");

ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_manual_pupils" ADD CONSTRAINT "teacher_manual_pupils_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_manual_pupils" ADD CONSTRAINT "teacher_manual_pupils_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_class_pupils" ADD CONSTRAINT "teacher_class_pupils_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "teacher_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_class_pupils" ADD CONSTRAINT "teacher_class_pupils_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_class_pupils" ADD CONSTRAINT "teacher_class_pupils_manualPupilId_fkey"
  FOREIGN KEY ("manualPupilId") REFERENCES "teacher_manual_pupils"("id") ON DELETE CASCADE ON UPDATE CASCADE;
