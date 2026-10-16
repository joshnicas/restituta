CREATE TABLE "question_option_images" (
    "id" SERIAL NOT NULL,
    "questionOptionId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "question_option_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_option_images_questionOptionId_order_key" ON "question_option_images"("questionOptionId", "order");
CREATE INDEX "question_option_images_questionOptionId_idx" ON "question_option_images"("questionOptionId");

ALTER TABLE "question_option_images"
ADD CONSTRAINT "question_option_images_questionOptionId_fkey"
FOREIGN KEY ("questionOptionId") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "question_option_images" ("questionOptionId", "url", "count", "order")
SELECT "id", "image", 1, 0 FROM "question_options" WHERE "image" IS NOT NULL;
