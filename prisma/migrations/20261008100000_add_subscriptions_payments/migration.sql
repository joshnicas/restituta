CREATE TYPE "SubscriptionDurationUnit" AS ENUM ('MONTH');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'AMOUNT_MISMATCH');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "durationUnit" "SubscriptionDurationUnit" NOT NULL DEFAULT 'MONTH',
  "price" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'SAYARI',
  "externalRef" TEXT NOT NULL,
  "providerOrderId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "buyerPhone" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "providerReference" TEXT,
  "providerTransactionId" TEXT,
  "resultCode" TEXT,
  "failureReason" TEXT,
  "orderIdempotencyKey" TEXT NOT NULL,
  "walletIdempotencyKey" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payments_externalRef_key" ON "payments"("externalRef");
CREATE UNIQUE INDEX "payments_providerOrderId_key" ON "payments"("providerOrderId");
CREATE UNIQUE INDEX "payments_orderIdempotencyKey_key" ON "payments"("orderIdempotencyKey");
CREATE UNIQUE INDEX "payments_walletIdempotencyKey_key" ON "payments"("walletIdempotencyKey");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");
CREATE UNIQUE INDEX "payments_one_open_payment_per_user" ON "payments"("userId") WHERE "status" IN ('CREATED', 'PENDING');

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "planId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscriptions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "subscriptions_paymentId_key" ON "subscriptions"("paymentId");
CREATE INDEX "subscriptions_userId_status_expiresAt_idx" ON "subscriptions"("userId", "status", "expiresAt");

CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "safePayload" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payment_events_provider_eventId_key" ON "payment_events"("provider", "eventId");
CREATE INDEX "payment_events_orderId_idx" ON "payment_events"("orderId");
CREATE INDEX "payment_events_createdAt_idx" ON "payment_events"("createdAt");
