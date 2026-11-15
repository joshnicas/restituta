import prisma from "../../prisma";
import { reconcileProviderPayment } from "./subscriptions.service";

const OPEN_STATUSES = ["CREATED", "PENDING"] as const;
const POLL_INTERVAL_MS = 15_000;
const BASE_RETRY_MS = 15_000;
const MAX_RETRY_MS = 5 * 60_000;
const CLAIM_LEASE_MS = 60_000;
const BATCH_SIZE = 40;
const CONCURRENCY = 5;

type Candidate = { id: string; providerCheckAttempts: number };

function retryDelay(attempt: number): number {
  return Math.min(BASE_RETRY_MS * 2 ** Math.min(Math.max(attempt - 1, 0), 5), MAX_RETRY_MS);
}

async function reconcileCandidate(candidate: Candidate): Promise<void> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
  const nextCheckAt = new Date(now.getTime() + retryDelay(candidate.providerCheckAttempts + 1));
  const claim = await prisma.payment.updateMany({
    where: {
      id: candidate.id,
      status: { in: [...OPEN_STATUSES] },
      providerOrderId: { not: null },
      nextProviderCheckAt: { lte: now },
      OR: [{ providerCheckLeaseUntil: null }, { providerCheckLeaseUntil: { lte: now } }],
    },
    data: {
      providerCheckAttempts: { increment: 1 },
      nextProviderCheckAt: nextCheckAt,
      providerCheckLeaseUntil: leaseUntil,
    },
  });
  if (!claim.count) return;

  try {
    const result = await reconcileProviderPayment(candidate.id);
    if (result.error) {
      console.warn(JSON.stringify({ component: "payment-reconciliation", event: "PROVIDER_CHECK_RETRY", paymentId: candidate.id }));
    } else if (result.providerStatus && !["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "PENDING", "CREATED"].includes(result.providerStatus)) {
      console.warn(JSON.stringify({ component: "payment-reconciliation", event: "UNKNOWN_PROVIDER_STATUS", paymentId: candidate.id, providerStatus: result.providerStatus }));
    }
  } finally {
    try {
      await prisma.payment.updateMany({ where: { id: candidate.id, providerCheckLeaseUntil: leaseUntil }, data: { providerCheckLeaseUntil: null } });
    } catch {
      console.error(JSON.stringify({ component: "payment-reconciliation", event: "LEASE_RELEASE_FAILED", paymentId: candidate.id }));
    }
  }
}

async function runBatch(): Promise<void> {
  const now = new Date();
  const candidates = await prisma.payment.findMany({
    where: {
      status: { in: [...OPEN_STATUSES] },
      providerOrderId: { not: null },
      nextProviderCheckAt: { lte: now },
      OR: [{ providerCheckLeaseUntil: null }, { providerCheckLeaseUntil: { lte: now } }],
    },
    orderBy: { nextProviderCheckAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, providerCheckAttempts: true },
  });

  for (let offset = 0; offset < candidates.length; offset += CONCURRENCY) {
    const batch = candidates.slice(offset, offset + CONCURRENCY);
    await Promise.all(batch.map(async (candidate) => {
      try {
        await reconcileCandidate(candidate);
      } catch {
        console.error(JSON.stringify({ component: "payment-reconciliation", event: "PAYMENT_CHECK_FAILED", paymentId: candidate.id }));
      }
    }));
  }
}

export function startPaymentReconciliationWorker(): () => void {
  if (process.env.PAYMENT_RECONCILIATION_ENABLED?.toLowerCase() === "false") {
    console.info(JSON.stringify({ component: "payment-reconciliation", event: "WORKER_DISABLED" }));
    return () => undefined;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runBatch();
    } catch {
      console.error(JSON.stringify({ component: "payment-reconciliation", event: "BATCH_FAILED" }));
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => { void tick(); }, POLL_INTERVAL_MS);
  timer.unref();
  void tick();
  console.info(JSON.stringify({ component: "payment-reconciliation", event: "WORKER_STARTED", intervalMs: POLL_INTERVAL_MS }));
  return () => clearInterval(timer);
}
