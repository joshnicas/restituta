import { randomUUID } from "node:crypto";

const baseUrl = (process.env.SAYARI_BASE_URL ?? "https://payment.sayarisoftware.com").replace(/\/$/, "");
const apiKey = process.env.SAYARI_API_KEY;

export class SayariError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
  if (!apiKey) throw new SayariError(503, "Payment service is not configured.");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, "X-Request-Id": randomUUID() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.SAYARI_REQUEST_TIMEOUT_MS ?? 10000)),
    });
  } catch {
    throw new SayariError(503, "Payment service is temporarily unavailable.");
  }
  let data: any = null;
  try { data = await response.json(); } catch { /* provider body is intentionally not exposed */ }
  if (!response.ok) {
    const message = response.status === 429 || response.status >= 500 ? "Payment service is temporarily unavailable." : "Payment request could not be accepted.";
    throw new SayariError(response.status, message);
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  if (!apiKey) throw new SayariError(503, "Payment service is not configured.");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "X-Request-Id": randomUUID() },
      signal: AbortSignal.timeout(Number(process.env.SAYARI_REQUEST_TIMEOUT_MS ?? 10000)),
    });
  } catch {
    throw new SayariError(503, "Payment service is temporarily unavailable.");
  }
  if (!response.ok) throw new SayariError(response.status, "Payment status could not be verified.");
  return await response.json() as T;
}

export const sayariService = {
  createOrder: (body: Record<string, unknown>, key: string) => request<{ orderId: string; status: string }>("/api/v1/checkout/orders", body, key),
  requestWalletPayment: (orderId: string, msisdn: string, key: string) => request<{ status: string }>(`/api/v1/checkout/orders/${encodeURIComponent(orderId)}/wallet-payment`, { msisdn }, key),
  getOrder: (orderId: string) => get<Record<string, unknown>>(`/api/v1/checkout/orders/${encodeURIComponent(orderId)}`),
};
