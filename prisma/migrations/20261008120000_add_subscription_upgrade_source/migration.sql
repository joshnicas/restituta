ALTER TABLE "payments"
ADD COLUMN "upgradeFromSubscriptionId" TEXT;

CREATE INDEX "payments_upgradeFromSubscriptionId_idx"
ON "payments"("upgradeFromSubscriptionId");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_upgradeFromSubscriptionId_fkey"
FOREIGN KEY ("upgradeFromSubscriptionId")
REFERENCES "subscriptions"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
