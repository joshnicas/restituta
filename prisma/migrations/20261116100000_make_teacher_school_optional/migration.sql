ALTER TABLE "teachers" ALTER COLUMN "schoolCode" DROP NOT NULL;
ALTER TABLE "teachers" ALTER COLUMN "territory" DROP NOT NULL;

DROP INDEX IF EXISTS "teachers_status_createdAt_idx";
ALTER TABLE "teachers" DROP COLUMN IF EXISTS "status";
ALTER TABLE "teachers" DROP COLUMN IF EXISTS "approvedAt";
DROP TYPE IF EXISTS "TeacherStatus";
