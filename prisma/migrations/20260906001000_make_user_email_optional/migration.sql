-- Make `email` column nullable in users table
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
