ALTER TABLE "payments"
  ADD COLUMN "nextProviderCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "providerCheckAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "providerCheckLeaseUntil" TIMESTAMP(3);

CREATE INDEX "payments_status_nextProviderCheckAt_idx"
  ON "payments"("status", "nextProviderCheckAt");
