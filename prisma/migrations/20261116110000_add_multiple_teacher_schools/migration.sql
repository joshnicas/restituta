CREATE TABLE "teacher_schools" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "territory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_schools_teacherId_schoolCode_territory_key"
  ON "teacher_schools"("teacherId", "schoolCode", "territory");
CREATE INDEX "teacher_schools_schoolCode_territory_idx"
  ON "teacher_schools"("schoolCode", "territory");

ALTER TABLE "teacher_schools" ADD CONSTRAINT "teacher_schools_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "teacher_schools" ("id", "teacherId", "schoolCode", "territory")
SELECT 'legacy_' || md5("id" || ':' || "schoolCode" || ':' || "territory"), "id", "schoolCode", "territory"
FROM "teachers"
WHERE "schoolCode" IS NOT NULL AND "territory" IS NOT NULL
ON CONFLICT ("teacherId", "schoolCode", "territory") DO NOTHING;
