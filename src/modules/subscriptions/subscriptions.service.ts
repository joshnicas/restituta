import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../../prisma";
import { sayariService, SayariError } from "./sayari.service";

function audit(event: string, details: Record<string, string | number | null>): void {
  console.info(JSON.stringify({ component: "subscription-payments", event, ...details }));
}

export function normalizeTanzanianPhone(input: string): string {
  const digits = input.trim().replace(/[\s()+-]/g, "");
  const normalized = /^(?:0)?([67]\d{8})$/.test(digits) ? `255${digits.replace(/^0/, "")}` : /^255[67]\d{8}$/.test(digits) ? digits : "";
  if (!normalized) throw new Error("Enter a valid Tanzanian mobile number.");
  return normalized;
}

function plusMonths(date: Date, months: number): Date {
  const result = new Date(date); const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const end = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, end)); return result;
}

async function activatePaidSubscription(
  tx: Prisma.TransactionClient,
  payment: { id: string; userId: number; planId: string; upgradeFromSubscriptionId: string | null; plan: { duration: number } },
  providerDetails: { reference: string | null; transactionId: string | null; resultCode: string | null },
): Promise<void> {
  if (await tx.subscription.findUnique({ where: { paymentId: payment.id }, select: { id: true } })) return;

  const now = new Date();
  let expiryBase = now;
  if (payment.upgradeFromSubscriptionId) {
    const previous = await tx.subscription.findUnique({ where: { id: payment.upgradeFromSubscriptionId } });
    if (previous && previous.userId === payment.userId && previous.status === "ACTIVE" && previous.expiresAt > now) {
      expiryBase = previous.expiresAt;
      await tx.subscription.update({ where: { id: previous.id }, data: { status: "CANCELLED" } });
    } else if (previous && previous.userId === payment.userId && previous.status === "ACTIVE") {
      await tx.subscription.update({ where: { id: previous.id }, data: { status: "EXPIRED" } });
    }
  }

  const expiresAt = plusMonths(expiryBase, payment.plan.duration);
  await tx.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", providerReference: providerDetails.reference, providerTransactionId: providerDetails.transactionId, resultCode: providerDetails.resultCode, completedAt: now } });
  await tx.subscription.create({ data: { userId: payment.userId, planId: payment.planId, paymentId: payment.id, status: "ACTIVE", startedAt: now, expiresAt } });
}

export function verifySayariSignature(rawBody: Buffer, timestamp: string, signature: string, secret: string, toleranceMs = 300000, now = Date.now()): boolean {
  const numericTimestamp = Number(timestamp);
  const timestampMs = Number.isFinite(numericTimestamp)
    ? numericTimestamp < 1e12 ? numericTimestamp * 1000 : numericTimestamp
    : Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > toleranceMs) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest();
  const providedHex = signature.replace(/^sha256=/i, "");
  if (!/^[a-f\d]{64}$/i.test(providedHex)) return false;
  const provided = Buffer.from(providedHex, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export const subscriptionsService = {
  listPlans: () => prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { duration: "asc" }, select: { id: true, code: true, name: true, duration: true, durationUnit: true, price: true, currency: true } }),

  getMine: async (userId: number) => {
    const now = new Date();
    const current = await prisma.subscription.findFirst({ where: { userId, status: "ACTIVE", expiresAt: { gt: now } }, include: { plan: { select: { code: true, name: true, duration: true } } }, orderBy: { expiresAt: "desc" } });
    if (!current) {
      await prisma.subscription.updateMany({ where: { userId, status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      return { hasActiveSubscription: false, subscription: null };
    }
    return { hasActiveSubscription: true, subscription: { id: current.id, plan: current.plan.code, planName: current.plan.name, duration: current.plan.duration, status: current.status, startedAt: current.startedAt, expiresAt: current.expiresAt } };
  },

  createPayment: async (userId: number, planId: string, phoneInput: string) => {
    const phone = normalizeTanzanianPhone(phoneInput);
    const [user, plan, active] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, userID: true } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
      prisma.subscription.findFirst({ where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } }, include: { plan: { select: { duration: true } } } }),
    ]);
    if (!user) throw new Error("User account was not found.");
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) throw new Error("Add a valid email to your account before subscribing.");
    if (!plan || !plan.isActive) throw new Error("This subscription plan is unavailable.");
    if (active && plan.duration <= active.plan.duration) throw new Error("Choose a longer plan to upgrade your active subscription.");

    const externalRef = `kido_${randomUUID()}`; const orderKey = randomUUID(); const walletKey = randomUUID();
    let payment;
    try { payment = await prisma.payment.create({ data: { userId, planId: plan.id, upgradeFromSubscriptionId: active?.id ?? null, externalRef, amount: plan.price, currency: plan.currency, buyerPhone: phone, orderIdempotencyKey: orderKey, walletIdempotencyKey: walletKey } }); }
    catch { throw new Error("A payment is already in progress for your account. Check its status before trying again."); }

    try {
      audit("PAYMENT_CREATED", { paymentId: payment.id, userId, planCode: plan.code, amount: plan.price });
      const order = await sayariService.createOrder({ externalRef, buyerEmail: user.email, buyerName: user.userID, buyerPhone: phone, amount: plan.price, currency: plan.currency }, orderKey);
      if (!order?.orderId) throw new SayariError(502, "Payment service returned an invalid order.");
      await prisma.payment.update({ where: { id: payment.id }, data: { providerOrderId: order.orderId } });
      await sayariService.requestWalletPayment(order.orderId, phone, walletKey);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "PENDING" } });
      audit("PAYMENT_PENDING", { paymentId: payment.id, userId });
      return { paymentId: payment.id, status: "PENDING", message: "Payment request sent. Complete it on your phone." };
    } catch (error) {
      if (error instanceof SayariError && [400, 401, 403].includes(error.status)) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "Provider rejected payment request" } });
        audit("PAYMENT_FAILED", { paymentId: payment.id, userId, providerStatus: error.status });
        throw error;
      }
      // Timeouts and provider 409/429/5xx responses have an ambiguous outcome.
      // Keep the local attempt open so a retry cannot create a second wallet push.
      return { paymentId: payment.id, status: "CREATED", message: "We’re confirming your payment request. Please don’t submit another payment." };
    }
  },

  getPayment: async (userId: number, paymentId: string) => {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId }, include: { subscription: { select: { status: true, expiresAt: true } }, plan: { select: { duration: true } }, upgradeFromSubscription: true } });
    if (!payment) return null;
    let statusMessage: string | undefined;
    if (["CREATED", "PENDING"].includes(payment.status) && payment.providerOrderId) {
      try {
        const order = await sayariService.getOrder(payment.providerOrderId);
        const providerStatus = typeof order.status === "string" ? order.status.toUpperCase() : "";
        if (providerStatus === "COMPLETED") {
          const amount = Number(order.amount);
          if (amount !== payment.amount || order.currency !== payment.currency) {
            await prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } }, data: { status: "AMOUNT_MISMATCH", failureReason: "Provider amount or currency did not match" } });
          } else {
            await prisma.$transaction(async (tx) => {
              const current = await tx.payment.findUnique({ where: { id: payment.id } });
              if (!current || current.status === "COMPLETED" || (["CANCELLED", "FAILED", "EXPIRED", "AMOUNT_MISMATCH"].includes(current.status) && providerStatus !== "COMPLETED")) return;
              await activatePaidSubscription(tx, payment, { reference: typeof order.reference === "string" ? order.reference : null, transactionId: typeof order.transid === "string" ? order.transid : null, resultCode: typeof order.resultCode === "string" ? order.resultCode : null });
            });
          }
        } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(providerStatus)) {
            await prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } }, data: { status: providerStatus as PaymentStatus, failureReason: `Sayari order ended with status ${providerStatus}` } });
        }
      } catch (error) {
        // A provider 404 means this order does not exist and cannot be charged.
        // Other failures remain open because their outcome is ambiguous.
        if (error instanceof SayariError && error.status === 404) {
          await prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } }, data: { status: "FAILED", failureReason: "Sayari order was not found" } });
          audit("PAYMENT_FAILED", { paymentId: payment.id, userId, providerStatus: 404 });
        } else {
          statusMessage = "Payment status could not be verified right now. The payment remains locked to avoid a duplicate charge; you can retry the check or request cancellation.";
        }
      }
    }
    const latest = await prisma.payment.findFirst({ where: { id: payment.id, userId }, include: { subscription: { select: { status: true, expiresAt: true } } } });
    if (!latest) return null;
    return { paymentId: latest.id, status: latest.status, ...(statusMessage ? { message: statusMessage } : {}), ...(latest.status === "CREATED" || latest.status === "PENDING" ? { phoneNumber: latest.buyerPhone } : {}), ...(latest.subscription ? { subscription: latest.subscription } : {}) };
  },

  getOpenPayment: async (userId: number) => {
    const payment = await prisma.payment.findFirst({ where: { userId, status: { in: ["CREATED", "PENDING"] } }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, buyerPhone: true } });
    return payment ? { paymentId: payment.id, status: payment.status, phoneNumber: payment.buyerPhone } : null;
  },

  cancelPayment: async (userId: number, paymentId: string) => {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment) return null;
    if (["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"].includes(payment.status)) {
      return { paymentId: payment.id, status: payment.status };
    }
    if (!payment.providerOrderId) {
      // The wallet-payment step only runs after this ID is saved. No prompt was sent,
      // so an order-creation timeout can be safely cleared for a new attempt.
      const result = await prisma.payment.updateMany({ where: { id: payment.id, userId, status: "CREATED", providerOrderId: null }, data: { status: "CANCELLED", failureReason: "Cancelled before a wallet payment request was created" } });
      if (result.count) audit("PAYMENT_CANCELLED", { paymentId: payment.id, userId });
      const current = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
      return { paymentId: payment.id, status: current?.status ?? "PENDING", message: current?.status === "CANCELLED" ? "No mobile money request was sent. You can start a new payment." : "Payment state changed. Check its status before trying again." };
    }

    try {
      await sayariService.cancelOrder(payment.providerOrderId);
    } catch (error) {
      if (!(error instanceof SayariError)) throw error;
      // A terminal or already-cancelled order may reject DELETE. Read the authoritative state below.
    }

    let order: Record<string, unknown>;
    try {
      order = await sayariService.getOrder(payment.providerOrderId);
    } catch (error) {
      if (!(error instanceof SayariError) || error.status !== 404) throw error;
      const result = await prisma.payment.updateMany({ where: { id: payment.id, userId, status: { in: ["CREATED", "PENDING"] } }, data: { status: "CANCELLED", failureReason: "Sayari order was not found during cancellation" } });
      if (result.count) audit("PAYMENT_CANCELLED", { paymentId: payment.id, userId });
      const current = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
      return { paymentId: payment.id, status: current?.status ?? "PENDING", message: current?.status === "CANCELLED" ? "Sayari has no active order for this payment. You can start a new payment." : "Payment status changed. Check its status before trying again." };
    }
    const status = typeof order.status === "string" ? order.status.toUpperCase() : "";
    if (status === "COMPLETED") {
      // Let the verified callback perform the transaction and subscription activation.
      return { paymentId: payment.id, status: "PENDING", message: "Payment completed and is being confirmed." };
    }
    if (!["CANCELLED", "FAILED", "EXPIRED"].includes(status)) {
      return { paymentId: payment.id, status: "PENDING", message: "Cancellation is still being confirmed. Please check again before starting another payment." };
    }

    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, userId, status: { in: ["CREATED", "PENDING"] } },
      data: { status: status as PaymentStatus, failureReason: status === "CANCELLED" ? "Cancelled by user through Sayari" : `Sayari order ended with status ${status}` },
    });
    if (updated.count) audit(`PAYMENT_${status}`, { paymentId: payment.id, userId });
    const current = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
    return { paymentId: payment.id, status: current?.status ?? "PENDING", message: current?.status === "CANCELLED" ? "Payment cancelled. You can start a new payment." : current?.status && ["FAILED", "EXPIRED"].includes(current.status) ? "The payment request has ended. You can start a new payment." : "Payment status changed while cancellation was processing. Check its status before retrying." };
  },

  processWebhook: async (rawBody: Buffer, headers: Record<string, string | string[] | undefined>) => {
    const timestamp = headers["x-sayari-timestamp"]; const signature = headers["x-sayari-signature"];
    const productHeader = headers["x-sayari-product-id"]; const secret = process.env.SAYARI_CALLBACK_SECRET;
    if (typeof timestamp !== "string" || typeof signature !== "string" || !secret) throw new Error("Invalid callback.");
    const tolerance = Number(process.env.SAYARI_WEBHOOK_TOLERANCE_SECONDS ?? 300) * 1000;
    if (!verifySayariSignature(rawBody, timestamp, signature, secret, tolerance)) throw new Error("Invalid callback.");

    let event: any;
    try { event = JSON.parse(rawBody.toString("utf8")); } catch { throw new Error("Invalid callback."); }
    const expectedProduct = process.env.SAYARI_PRODUCT_ID;
    const eventHeader = headers["x-sayari-event"];
    if (!event || typeof event.eventId !== "string" || typeof event.type !== "string" || typeof event.orderId !== "string" || typeof (event.status ?? event.paymentStatus) !== "string" || !expectedProduct || event.productId !== expectedProduct || productHeader !== expectedProduct || eventHeader !== event.type) throw new Error("Invalid callback.");
    const eventStatus = String(event.status ?? event.paymentStatus).toUpperCase();
    audit("WEBHOOK_RECEIVED", { eventId: event.eventId, orderId: event.orderId, status: eventStatus });
    const payment = await prisma.payment.findFirst({ where: { OR: [{ providerOrderId: event.orderId }, ...(typeof event.externalRef === "string" ? [{ externalRef: event.externalRef }] : [])] }, include: { plan: true, upgradeFromSubscription: true } });
    if (!payment) throw new Error("Payment not found.");
    const amount = Number(event.amount); const amountValid = amount === payment.amount && event.currency === payment.currency;
    const terminal = ["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"];
    if (!terminal.includes(eventStatus) && eventStatus !== "PENDING") throw new Error("Invalid callback.");

    await prisma.$transaction(async (tx) => {
      const where = { provider_eventId: { provider: "SAYARI", eventId: event.eventId } };
      if (await tx.paymentEvent.findUnique({ where })) return;
      await tx.paymentEvent.create({ data: { provider: "SAYARI", eventId: event.eventId, eventType: event.type, orderId: event.orderId, paymentId: payment.id, safePayload: { status: eventStatus, amount, currency: event.currency, reference: typeof event.reference === "string" ? event.reference : null, transid: typeof event.transid === "string" ? event.transid : null } } });
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current || current.status === "COMPLETED" || (["FAILED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"].includes(current.status) && eventStatus !== "COMPLETED")) {
        await tx.paymentEvent.update({ where, data: { processedAt: new Date() } }); return;
      }
      if (eventStatus === "COMPLETED" && current.status === "CANCELLED" && await tx.subscription.findUnique({ where: { paymentId: payment.id }, select: { id: true } })) {
        await tx.paymentEvent.update({ where, data: { processedAt: new Date() } }); return;
      }
      if (!current.providerOrderId) await tx.payment.update({ where: { id: payment.id }, data: { providerOrderId: event.orderId } });
      if (eventStatus === "PENDING") { await tx.paymentEvent.update({ where, data: { processedAt: new Date() } }); return; }
      if (eventStatus === "COMPLETED" && !amountValid) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "AMOUNT_MISMATCH", failureReason: "Provider amount or currency did not match" } });
        audit("PAYMENT_AMOUNT_MISMATCH", { paymentId: payment.id, userId: payment.userId });
      } else if (eventStatus === "COMPLETED") {
        await activatePaidSubscription(tx, payment, { reference: typeof event.reference === "string" ? event.reference : null, transactionId: typeof event.transid === "string" ? event.transid : null, resultCode: typeof event.resultCode === "string" ? event.resultCode : null });
        const subscription = await tx.subscription.findUnique({ where: { paymentId: payment.id }, select: { expiresAt: true } });
        audit("SUBSCRIPTION_ACTIVATED", { paymentId: payment.id, userId: payment.userId, expiresAt: subscription?.expiresAt.toISOString() ?? null });
      } else {
        await tx.payment.update({ where: { id: payment.id }, data: { status: eventStatus as PaymentStatus, failureReason: typeof event.resultCode === "string" ? `Provider result ${event.resultCode}` : null } });
        audit(`PAYMENT_${eventStatus}`, { paymentId: payment.id, userId: payment.userId });
      }
      await tx.paymentEvent.update({ where, data: { processedAt: new Date() } });
    });
  },
};
