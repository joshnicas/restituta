import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
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

export function verifySayariSignature(rawBody: Buffer, timestamp: string, signature: string, secret: string, toleranceMs = 300000, now = Date.now()): boolean {
  const seconds = Number(timestamp); const timestampMs = seconds < 1e12 ? seconds * 1000 : seconds;
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
    const current = await prisma.subscription.findFirst({ where: { userId, status: "ACTIVE", expiresAt: { gt: now } }, include: { plan: { select: { code: true, name: true } } }, orderBy: { expiresAt: "desc" } });
    if (!current) {
      await prisma.subscription.updateMany({ where: { userId, status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      return { hasActiveSubscription: false, subscription: null };
    }
    return { hasActiveSubscription: true, subscription: { id: current.id, plan: current.plan.code, planName: current.plan.name, status: current.status, startedAt: current.startedAt, expiresAt: current.expiresAt } };
  },

  createPayment: async (userId: number, planId: string, phoneInput: string) => {
    const phone = normalizeTanzanianPhone(phoneInput);
    const [user, plan, active] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, userID: true } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
      prisma.subscription.findFirst({ where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } }, select: { id: true } }),
    ]);
    if (!user) throw new Error("User account was not found.");
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) throw new Error("Add a valid email to your account before subscribing.");
    if (!plan || !plan.isActive) throw new Error("This subscription plan is unavailable.");
    if (active) throw new Error("You already have an active subscription.");

    const externalRef = `kido_${randomUUID()}`; const orderKey = randomUUID(); const walletKey = randomUUID();
    let payment;
    try { payment = await prisma.payment.create({ data: { userId, planId: plan.id, externalRef, amount: plan.price, currency: plan.currency, buyerPhone: phone, orderIdempotencyKey: orderKey, walletIdempotencyKey: walletKey } }); }
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
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId }, include: { subscription: { select: { status: true, expiresAt: true } } } });
    if (!payment) return null;
    return { paymentId: payment.id, status: payment.status, ...(payment.subscription ? { subscription: payment.subscription } : {}) };
  },

  getOpenPayment: async (userId: number) => {
    const payment = await prisma.payment.findFirst({ where: { userId, status: { in: ["CREATED", "PENDING"] } }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, buyerPhone: true } });
    return payment ? { paymentId: payment.id, status: payment.status, phoneNumber: payment.buyerPhone } : null;
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
    if (!event || typeof event.eventId !== "string" || typeof event.type !== "string" || typeof event.orderId !== "string" || typeof event.status !== "string" || !expectedProduct || event.productId !== expectedProduct || productHeader !== expectedProduct || eventHeader !== event.type) throw new Error("Invalid callback.");
    audit("WEBHOOK_RECEIVED", { eventId: event.eventId, orderId: event.orderId, status: event.status });
    const payment = await prisma.payment.findFirst({ where: { OR: [{ providerOrderId: event.orderId }, ...(typeof event.externalRef === "string" ? [{ externalRef: event.externalRef }] : [])] }, include: { plan: true } });
    if (!payment) throw new Error("Payment not found.");
    const amount = Number(event.amount); const amountValid = amount === payment.amount && event.currency === payment.currency;
    const terminal = ["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"];
    if (!terminal.includes(event.status) && event.status !== "PENDING") throw new Error("Invalid callback.");

    await prisma.$transaction(async (tx) => {
      const where = { provider_eventId: { provider: "SAYARI", eventId: event.eventId } };
      if (await tx.paymentEvent.findUnique({ where })) return;
      await tx.paymentEvent.create({ data: { provider: "SAYARI", eventId: event.eventId, eventType: event.type, orderId: event.orderId, paymentId: payment.id, safePayload: { status: event.status, amount, currency: event.currency, reference: typeof event.reference === "string" ? event.reference : null, transid: typeof event.transid === "string" ? event.transid : null } } });
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current || current.status === "COMPLETED" || ["FAILED", "CANCELLED", "EXPIRED", "AMOUNT_MISMATCH"].includes(current.status)) {
        await tx.paymentEvent.update({ where, data: { processedAt: new Date() } }); return;
      }
      if (!current.providerOrderId) await tx.payment.update({ where: { id: payment.id }, data: { providerOrderId: event.orderId } });
      if (event.status === "PENDING") { await tx.paymentEvent.update({ where, data: { processedAt: new Date() } }); return; }
      if (event.status === "COMPLETED" && !amountValid) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "AMOUNT_MISMATCH", failureReason: "Provider amount or currency did not match" } });
        audit("PAYMENT_AMOUNT_MISMATCH", { paymentId: payment.id, userId: payment.userId });
      } else if (event.status === "COMPLETED") {
        const now = new Date(); const expiresAt = plusMonths(now, payment.plan.duration);
        await tx.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED", providerReference: typeof event.reference === "string" ? event.reference : null, providerTransactionId: typeof event.transid === "string" ? event.transid : null, resultCode: typeof event.resultCode === "string" ? event.resultCode : null, completedAt: now } });
        await tx.subscription.create({ data: { userId: payment.userId, planId: payment.planId, paymentId: payment.id, status: "ACTIVE", startedAt: now, expiresAt } });
        audit("SUBSCRIPTION_ACTIVATED", { paymentId: payment.id, userId: payment.userId, expiresAt: expiresAt.toISOString() });
      } else {
        await tx.payment.update({ where: { id: payment.id }, data: { status: event.status, failureReason: typeof event.resultCode === "string" ? `Provider result ${event.resultCode}` : null } });
        audit(`PAYMENT_${event.status}`, { paymentId: payment.id, userId: payment.userId });
      }
      await tx.paymentEvent.update({ where, data: { processedAt: new Date() } });
    });
  },
};
