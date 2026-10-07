# Kido subscriptions and Sayari payments

## Architecture

Kido Mobile → authenticated Kido Backend → Sayari → Selcom → mobile money. Mobile and Angular only communicate with the Kido API. Sayari credentials remain on the backend.

## Configuration

Set the backend environment variables shown in `.env.example`: `SAYARI_BASE_URL`, `SAYARI_API_KEY`, `SAYARI_CALLBACK_SECRET`, `SAYARI_PRODUCT_ID`, `SAYARI_REQUEST_TIMEOUT_MS`, and `SAYARI_WEBHOOK_TOLERANCE_SECONDS`. Use placeholders in local examples only. Configure HTTPS callback URL `https://YOUR_KIDO_BACKEND_DOMAIN/webhooks/sayari` in Sayari app Settings. Set the callback secret and product ID to matching values. Allowlist the backend's fixed egress IP with Sayari when IP allowlisting is enabled.

Use an `sk_test_...` key for sandbox. For production, configure `sk_live_...` only in the backend's secret manager, verify the production callback secret/product ID and HTTPS URL, then deploy. Do not place credentials in Expo, Angular, Git, logs, or API responses.

## Data and API

`SubscriptionPlan` rows are seeded on backend startup using stable codes `month`, `half-year`, and `year`. Seeding creates missing plans and leaves existing plan prices/activation settings unchanged. Defaults are 1,000, 5,000, and 10,000 TZS. Admin price changes affect future purchases only; each payment snapshots its amount and currency.

Authenticated endpoints:

* `GET /subscription/plans` — active plan prices.
* `GET /subscription/me` — current subscription for the JWT subject.
* `POST /subscription/pay` — `{ "planId": "...", "phoneNumber": "7XXXXXXXX" }`; amount and user ID are never accepted.
* `GET /subscription/payments/:paymentId` — own payment status only.
* `GET /admin/payments` — admin-authorized, read-only payment history.

Admin Users reads include a compact current subscription summary. Admin payment history is read-only; it cannot grant entitlements.

## Payment flow and integrity

The backend checks the authenticated user, active plan, database price, account email, normalized Tanzanian number, and active subscription before making an order. It writes a local payment before contacting Sayari, then uses distinct idempotency keys for order creation and wallet push. A partial unique database index permits at most one CREATED/PENDING payment per user. A provider 202/PENDING response never activates access.

Callbacks are read as raw bytes before JSON middleware, timestamp checked, and verified with HMAC-SHA256 over `timestamp + "." + rawBody` using constant-time comparison. Event IDs are unique per provider. A database transaction records the event, validates amount/currency, updates payment state, and creates one subscription. Duplicate callbacks cannot extend the entitlement. Subscription expiry begins at confirmed payment time and uses UTC calendar months, clamping month-end dates (for example, January 31 plus one month becomes the last day of February). Purchases while an active subscription exists are rejected; they are not queued or silently overlapped.

## Mobile flow

The mobile screen loads prices from `GET /subscription/plans`, requests a wallet push through the backend, displays a waiting state, and polls only the Kido payment endpoint. It displays success only after the backend reports COMPLETED. Phone numbers are sent as `255XXXXXXXXX`; phone values in user-facing copy are normalized by the phone entry screen.

## Deployment and sandbox checklist

1. Apply the additive Prisma migration with the normal production migration workflow; it does not drop existing tables or rows.
2. Configure server-only Sayari variables and the public HTTPS callback URL.
3. Ensure proxy/body middleware preserves raw webhook bytes and the webhook body limit remains appropriate.
4. Confirm Sayari IP allowlisting and outbound network access from the backend.
5. Use sandbox phone/account details to verify pending, completed, failed, cancelled, expired, and mismatched amount callbacks.
6. Switch to live credentials only after sandbox callback verification and production URL/allowlist checks.

Provider response bodies and credentials are intentionally excluded from client errors and logs.
