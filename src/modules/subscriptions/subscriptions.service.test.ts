import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { normalizeTanzanianPhone, verifySayariSignature } from "./subscriptions.service";
import { subscriptionPaymentBody } from "./subscriptions.controller";

test("payment request accepts plan and phone only, and rejects client-supplied amount/user IDs", () => {
  assert.equal(subscriptionPaymentBody.safeParse({ planId: "plan-id", phoneNumber: "712345678" }).success, true);
  assert.equal(subscriptionPaymentBody.safeParse({ planId: "plan-id", phoneNumber: "712345678", amount: 1 }).success, false);
  assert.equal(subscriptionPaymentBody.safeParse({ planId: "plan-id", phoneNumber: "712345678", userId: 999 }).success, false);
});

test("normalizes local Tanzanian mobile numbers", () => {
  assert.equal(normalizeTanzanianPhone("712345678"), "255712345678");
  assert.equal(normalizeTanzanianPhone("0712345678"), "255712345678");
  assert.equal(normalizeTanzanianPhone("+255 712 345 678"), "255712345678");
  assert.equal(normalizeTanzanianPhone("255612345678"), "255612345678");
});

test("rejects invalid Tanzanian phone numbers", () => {
  assert.throws(() => normalizeTanzanianPhone("512345678"), /valid Tanzanian/);
  assert.throws(() => normalizeTanzanianPhone("25571234567"), /valid Tanzanian/);
});

test("accepts HMAC over exact callback bytes within the allowed time window", () => {
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const rawBody = Buffer.from('{"eventId":"evt-1","status":"COMPLETED"}');
  const signature = createHmac("sha256", "test-secret").update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  assert.equal(verifySayariSignature(rawBody, timestamp, signature, "test-secret", 300_000, now), true);
});

test("rejects altered bodies, incorrect signatures, and expired callback timestamps", () => {
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const rawBody = Buffer.from('{"eventId":"evt-1"}');
  const signature = createHmac("sha256", "test-secret").update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  assert.equal(verifySayariSignature(Buffer.from('{"eventId": "evt-1"}'), timestamp, signature, "test-secret", 300_000, now), false);
  assert.equal(verifySayariSignature(rawBody, timestamp, "0".repeat(64), "test-secret", 300_000, now), false);
  assert.equal(verifySayariSignature(rawBody, String(Number(timestamp) - 301), signature, "test-secret", 300_000, now), false);
});
