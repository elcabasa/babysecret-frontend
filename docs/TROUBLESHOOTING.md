# Troubleshooting

Diagnostics first: reproduce with controlled test data, then check the narrowest log scope (Vercel function logs, WooCommerce webhook log, FluentSMTP log) before changing configuration. Never paste secrets into logs, tickets, or chat.

## Terminal returns no quote

- Verify the customer state, city, street address, and country are complete and correctly spelled.
- Verify the store origin (`SHIPPING_PICKUP_*`) is complete; `SHIPPING_PICKUP_EMAIL` and `SHIPPING_PICKUP_PHONE` must be non-empty.
- Verify live/sandbox configuration: `TERMINAL_API_BASE` must match the environment that issued `TERMINAL_API_KEY`.
- Verify product weights resolved in server logs (`[shipping] Resolved parcel weights`); missing weights should show the `0.5` kg fallback, not an error.
- Check server logs for the Terminal error (status/message only — the key is never logged).
- Confirm the shopper sees the friendly unavailable message with pickup/assistance actions, not a provider error.

## Shipping is always the same price

- Verify the actual Terminal response varies by address/weight; identical quotes for wildly different parcels point at weight resolution, not the UI.
- Verify weight resolution logs show distinct per-product weights and quantities.
- Verify sandbox/live configuration — sandbox data can differ from production.
- Confirm no hardcoded or mock rate exists: search for `defaultItemWeightKg`, `SHIPPING_ITEM_WEIGHT_KG`, and provider fallbacks outside `ENABLED_SHIPPING_PROVIDERS`.

## Pickup not appearing

- Verify fulfillment state is `pickup` (switching methods clears the other flow's selection by design).
- Verify `GET /api/pickup-locations` returns the configured location (currently Flawless Plaza, id `flawless-plaza`).
- Verify the pickup location configuration in `src/config/pickup.ts`; unknown ids are rejected with `400` and select nothing.
- Verify Terminal quote state: the pickup picker only renders for the pickup method, and pickup never calls Terminal Africa.

## Email not arriving

- Verify Titan credentials: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` all set (blank counts as missing).
- Verify `EMAIL_FROM` is a valid bare or display-name address.
- Verify SMTP settings: port `465` with implicit TLS for Titan.
- Inspect server logs: missing config logs `[email] Titan SMTP is not configured` with variable names only; send failures log subject/recipients/reason without credentials.
- Inspect WooCommerce/FluentSMTP logs for canonical lifecycle mail — Next.js only sends the custom messages listed in [`EMAIL.md`](EMAIL.md).

## Payment-confirmed email not firing

- Verify the WooCommerce webhook is Active with topic `Order updated` and delivery URL `https://babysecret.com/api/webhooks/woocommerce/order`.
- Verify the webhook Secret matches `WOOCOMMERCE_WEBHOOK_SECRET` exactly, then redeploy (env changes need a redeploy).
- Inspect WooCommerce → Webhooks → View log for the delivery response code.
- Inspect Vercel logs filtered by `webhook` for signature/config rejections.
- Remember: the confirmation fires when the admin moves the order to Processing — "I've Made the Transfer" intentionally only records the claim.

## Google login failing

- Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set (server-only, never `NEXT_PUBLIC_`).
- Verify `AUTH_SECRET` is set; rotating it logs everyone out.
- Verify the production callback URL `https://babysecret.com/api/auth/callback/google` is registered in Google Cloud Console.
- Verify `NEXT_PUBLIC_APP_URL` matches the deployment domain.
- Check server logs for the classified auth error (`INVALID_CREDENTIALS`, `AUTH_ENDPOINT_NOT_FOUND`, `AUTH_SERVER_ERROR`, `AUTH_NETWORK_ERROR`, `ACCOUNT_NOT_FOUND`).

## Bank-transfer details look wrong

- Verify `MONIEPOINT_*` server variables — there are no hardcoded fallbacks, so blanks fail closed.
- Verify the `NEXT_PUBLIC_BANK_*` display fallback matches the server values.
- Verify the awaiting-payment page resolved via `/api/payment/bank-transfer/details`; a failed lookup withholds instructions rather than showing partial data.
- Never "fix" a wrong account number by hardcoding one — fix the environment value and redeploy.
