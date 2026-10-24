# Baby Secret Frontend

Baby Secret ecommerce frontend. It is a Next.js + React + TypeScript storefront for browsing products, managing a cart, checking out, paying by Bank Transfer, choosing Terminal Africa delivery or Flawless Plaza pickup, managing customer accounts, and viewing WooCommerce order history. The decoupled WordPress/WooCommerce backend owns products, customers, orders, canonical order email, and order status.

## Main architecture

```text
Frontend
  ↓
Next.js application
  ↓
WooCommerce REST / Store API
```

```text
Payments
  ↓
Bank Transfer currently active
Paystack/Flutterwave retained but hidden
```

```text
Shipping
  ↓
Terminal Africa
  ↓
Pickup fallback
```

```text
Email
  ↓
WooCommerce → FluentSMTP → Titan
Next.js custom mail → Nodemailer → Titan
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for client/server/WooCommerce responsibilities and trust boundaries.

## Feature overview

- **Product catalog** — homepage, `/shop`, category pages, search, product-detail pages, and wishlist.
- **Cart** — client-side cart with quantity controls and order summary.
- **Checkout** — validated customer, address, fulfillment, and payment selection.
- **Bank Transfer** — the only payment method shown to customers.
- **Terminal Africa delivery** — live `tship` quotes, server-side weight resolution, and server-side quote re-verification.
- **Pickup** — Flawless Plaza collection when delivery is unavailable or preferred; pickup never calls Terminal Africa.
- **Delivery assistance** — manual follow-up request when Terminal Africa returns no automatic quote.
- **Google login** — optional Google sign-in alongside email/password accounts.
- **OTP/password reset** — WooCommerce-backed verification codes and single-use reset tokens.
- **Order emails** — WooCommerce canonical lifecycle mail plus a small set of custom Next.js notifications.
- **WooCommerce webhook** — verified `order.updated` receiver for custom Next.js notifications.
- **Product-weight shipping calculation** — authoritative WooCommerce weights normalized to kilograms.

## Current production behavior

- Bank Transfer is the only visible payment method.
- Paystack and Flutterwave code remains in the repository but is hidden from customers.
- Terminal Africa (`tship`) is the only automatic delivery provider.
- Shipbubble code and credentials remain in the repository but Shipbubble is disabled.
- No mock or hardcoded delivery prices are used.
- Pickup is available when delivery is unavailable.
- The configured pickup location is Flawless Plaza.
- Pickup is free.
- Valid WooCommerce product/variation weights are used for delivery calculations.
- Missing or invalid product weight uses `0.5` kg.
- Weight is resolved server-side; the browser cannot submit a weight.
- Bank-transfer orders remain unpaid and `on-hold` until an administrator manually verifies payment.
- The frontend never marks a bank transfer as paid.

## Installation

Requirements:

- Node.js 20+ and npm.
- Access to the WooCommerce Store API and WooCommerce REST API.
- Environment values described in [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Restart `npm run dev` after changing environment variables.

## Required environment variables

Do not put real credentials in documentation, examples, commits, or chat output. Copy `.env.example` and supply deployment-specific values in `.env.local` or the hosting provider’s environment-variable screen.

The complete variable reference is [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checking with `tsc --noEmit` |
| `npm run build` | Create the production build |
| `npm start` | Run the production build |

## Production/deployment overview

1. Install dependencies and configure all required server-side credentials outside the repository.
2. Set production environment variables in the hosting provider.
3. Deploy the Next.js application.
4. Redeploy after changing production environment variables.
5. Register and verify the WooCommerce `order.updated` webhook.
6. Use Terminal Africa production credentials and base URL for live delivery.
7. Configure Titan SMTP mailbox credentials for custom Next.js mail.
8. Register the production Google OAuth callback when Google login is enabled.
9. Test `https://babysecret.com` with controlled checkout, payment, webhook, and email checks.

Full steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session and providers |
| `/api/account/register` | POST | Create customer and send OTP |
| `/api/account/verify-email` | POST | Verify OTP and mark email verified |
| `/api/account/resend-otp` | POST | Send another OTP |
| `/api/account/forgot-password` | POST | Create and email a password-reset token |
| `/api/account/reset-password` | POST | Consume a reset token and set a new password |
| `/api/checkout` | POST | Validate checkout and create the WooCommerce order |
| `/api/shipping/quotes` | POST | Terminal Africa delivery quotes |
| `/api/shipping/assistance` | POST | Delivery-assistance request and admin notification |
| `/api/pickup-locations` | GET | Configured pickup locations |
| `/api/payment/bank-transfer/details` | GET | Authoritative order total and receiving account |
| `/api/payment/bank-transfer/confirm` | POST | Record a transfer claim without marking the order paid |
| `/api/payment/verify` | GET | Card-gateway callback used only if those gateways are re-enabled |
| `/api/webhooks/payment` | POST | Card-gateway webhook receiver for future re-enablement |
| `/api/webhooks/woocommerce/order` | POST | Verified WooCommerce `order.updated` receiver |
| `/api/products` | GET | Product listing from the Store API |
| `/api/locations` | GET | Nigerian states/cities |

## Documentation index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system flow, responsibilities, and trust boundaries
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) — accounts, Google login, OTP, and password reset
- [`docs/ORDERS.md`](docs/ORDERS.md) — checkout-to-order lifecycle, WooCommerce webhook, and order history
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — Bank Transfer flow and hidden gateway integrations
- [`docs/SHIPPING.md`](docs/SHIPPING.md) — Terminal Africa quotes, weights, assistance, and provider configuration
- [`docs/PICKUP.md`](docs/PICKUP.md) — Flawless Plaza configuration and pickup order data
- [`docs/EMAIL.md`](docs/EMAIL.md) — WooCommerce canonical mail and custom Next.js mail
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — environment-variable reference
- [`docs/TESTING.md`](docs/TESTING.md) — local, browser, payment, email, webhook, and mobile checklist
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production deployment checklist
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — common failures and diagnostics
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — design/business source-of-truth map

## Known limitations

- Live checkout creates genuine WooCommerce orders; use controlled test orders when testing checkout or email.
- Frontend-driven checkout uses direct REST calls and does not replicate every native WooCommerce checkout-plugin behavior.
- Delivery-assistance deduplication uses an in-memory recent-request cache; serverless instances do not share that cache, although the deterministic request reference still identifies repeats.
- The optional Next.js shipped notification should be used only when WordPress does not already send the corresponding shipped message.
