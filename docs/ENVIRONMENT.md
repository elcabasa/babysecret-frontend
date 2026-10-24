# Environment configuration

All configuration comes from environment variables. `.env.example` is the placeholder-only template: copy it to `.env.local` for local development and set the same keys in the hosting provider for deployed environments. Never commit `.env`, `.env.local`, `.env.production`, credentials, API keys, OAuth secrets, SMTP passwords, or webhook secrets.

```bash
cp .env.example .env.local
```

Changing a variable in Vercel has **no effect until you redeploy** — Vercel bakes env vars into the build.

Conventions used below:

- **Public** — prefixed `NEXT_PUBLIC_`, bundled into the browser. Display-only values only.
- **Server-only** — never prefixed `NEXT_PUBLIC_`, available only to server code.
- **Required** — the feature fails closed without it.
- **Optional** — the feature works without it, possibly with reduced behavior.

## 1. Public/client configuration

| Variable | Required | Used in |
| --- | --- | --- |
| `NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL` | Yes (production) | Public Store API base for catalog, cart, and product lookups in dev, preview, and production |
| `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` | No | `"true"` renders the "Continue with Google" button in dev, preview, and production |
| `NEXT_PUBLIC_APP_URL` | Yes (production) | Public base URL for password-reset links and payment callbacks in dev, preview, and production |
| `NEXT_PUBLIC_BANK_NAME` / `NEXT_PUBLIC_BANK_ACCOUNT_NAME` / `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` | Display fallback | Client-side display fallback for the receiving account; keep in sync with the `MONIEPOINT_*` values |

## 2. WooCommerce

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `WOOCOMMERCE_REST_URL` | Server-only | Yes | REST v3 base for orders, customers, products, weights, and auth |
| `WOOCOMMERCE_CONSUMER_KEY` | Server-only | Yes | REST authentication alongside the consumer secret |
| `WOOCOMMERCE_CONSUMER_SECRET` | Server-only | Yes | REST authentication alongside the consumer key |
| `WOOCOMMERCE_ADMIN_URL` | Server-only | No | Deep-links admin order emails into the WooCommerce order editor |

## 3. Authentication

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Server-only | Yes | NextAuth JWT signing secret; rotating it logs everyone out |
| `AUTH_GOOGLE_ID` | Server-only | For Google login | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Server-only | For Google login | Google OAuth client secret; never reuse for SMTP |
| `AUTH_TRUST_HOST` | Server-only | For non-Vercel hosts | Lets NextAuth trust the request host for callbacks |

Register the `/api/auth/callback/google` redirect URI in the Google Cloud Console for every environment (local dev URL, preview deployment URL, `https://babysecret.com` production).

## 4. Email

Custom Next.js mail uses authenticated Titan SMTP over SSL. See [`EMAIL.md`](EMAIL.md).

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `EMAIL_HOST` | Server-only | Yes | SMTP host (`smtp.titan.email`) |
| `EMAIL_PORT` | Server-only | Yes | SMTP port (`465`) |
| `EMAIL_USER` | Server-only | Yes | Titan mailbox username |
| `EMAIL_PASSWORD` | Server-only | Yes | Titan mailbox SMTP credential; never a Google OAuth secret |
| `EMAIL_FROM` | Server-only | Yes | Sender; bare address or quoted `"Baby Secret <hello@babysecret.com>"` form |
| `EMAIL_ADMIN_TO` | Server-only | No | Comma-separated admin inboxes; falls back to the `EMAIL_FROM` address |
| `EMAIL_SECURE` | Server-only | No | TLS override; defaults to `true` on port 465, `false` otherwise |
| `EMAIL_SHIPPED_STATUSES` | Server-only | No | Override for the optional custom shipped-status list |

## 5. Shipping

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `SHIPPING_PROVIDER` | Server-only | No | Honored only if it names an enabled provider; anything else falls back to `tship` |
| `TERMINAL_API_KEY` | Server-only | Yes, for delivery | Terminal Africa API key for the matching `TERMINAL_API_BASE` environment |
| `TERMINAL_API_BASE` | Server-only | Yes, for delivery | `https://api.terminal.africa/v1` production, `https://sandbox.terminal.africa/v1` sandbox |
| `SHIPPUBBLE_API_KEY` / `SHIPPUBBLE_API_BASE` | Server-only | Future only | Preserved for re-enablement; currently unused |
| `SHIPPING_PICKUP_FIRST_NAME` / `SHIPPING_PICKUP_LAST_NAME` / `SHIPPING_PICKUP_EMAIL` / `SHIPPING_PICKUP_PHONE` / `SHIPPING_PICKUP_ADDRESS` / `SHIPPING_PICKUP_CITY` / `SHIPPING_PICKUP_STATE` / `SHIPPING_PICKUP_COUNTRY` / `SHIPPING_PICKUP_ZIP` | Server-only | Yes, for delivery | Store origin handed to Terminal Africa for quotes; `SHIPPING_PICKUP_EMAIL` and `SHIPPING_PICKUP_PHONE` must be non-empty; keep `SHIPPING_PICKUP_ADDRESS` at or under 45 characters (Terminal rejects longer `line1` values) |
| `SHIPPING_TRACKING_BASE_URL` | Server-only | No | Optional carrier tracking page for the "Track your parcel" email link |

Customer pickup points are **not** environment variables — they live in `src/config/pickup.ts`; see [`PICKUP.md`](PICKUP.md).

## 6. Bank Transfer

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `MONIEPOINT_BANK_NAME` / `MONIEPOINT_ACCOUNT_NAME` / `MONIEPOINT_ACCOUNT_NUMBER` | Server-only | Yes | Trusted receiving account; blank values fail closed instead of showing a placeholder |
| `NEXT_PUBLIC_BANK_NAME` / `NEXT_PUBLIC_BANK_ACCOUNT_NAME` / `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` | Public | Display fallback | Same account for the awaiting-payment display fallback |

## 7. Webhook

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `WOOCOMMERCE_WEBHOOK_SECRET` | Server-only | Yes, when the webhook is enabled | HMAC-SHA256 secret shared with the WooCommerce `order.updated` webhook; the same value goes in the WooCommerce webhook Secret field |

## 8. Optional/future integrations

| Variable | Visibility | Required | Used in |
| --- | --- | --- | --- |
| `PAYMENT_PROVIDER` | Server-only | Future only | Gateway name if card gateways are re-enabled |
| `PAYSTACK_SECRET_KEY` | Server-only | Future only | Paystack secret key, kept for re-enablement |
| `FLUTTERWAVE_SECRET_KEY` | Server-only | Future only | Flutterwave secret key, kept for re-enablement |
| `FLUTTERWAVE_WEBHOOK_SECRET_HASH` | Server-only | Future only | Flutterwave webhook verification, used only if Flutterwave webhooks are re-enabled |

## Never commit

Never commit any of these:

- `.env`
- `.env.local`
- `.env.production`
- API keys
- OAuth secrets
- SMTP passwords
- Webhook secrets
- Consumer keys/secrets
- Any file containing a real credential value

`.env.local` is gitignored. Verify with `git status` before every commit that no secret-bearing file is staged.

## Sandbox versus production

| Concern | Sandbox/test | Production/live |
| --- | --- | --- |
| Terminal Africa | `https://sandbox.terminal.africa/v1` with a sandbox key | `https://api.terminal.africa/v1` with a production key |
| WooCommerce | Staging store credentials | Live store credentials |
| Email | Titan mailbox that is safe for test volume | Production Titan mailbox |
| Webhook | Preview deployment URL + matching secret | `https://babysecret.com` URL + matching secret |
| OAuth | Preview redirect URI registered | Production redirect URI registered |

Never mix a sandbox key with a production base URL, or production credentials with a test deployment.
