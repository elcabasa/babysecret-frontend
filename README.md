# Baby Secret Frontend

Frontend for the Baby Secret e-commerce store, built with Next.js App Router, React, TypeScript, and Tailwind CSS. It renders the public catalog and runs the full shopping lifecycle — cart, checkout, delivery quotes, payments, customer accounts (email + Google), and order history — against a decoupled WordPress/WooCommerce backend at `babysecret.com`.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Lucide React icons
- **Data/forms:** Zod, React Hook Form
- **State:** Zustand (cart, wishlist — persisted to `localStorage`)
- **Auth:** NextAuth (Auth.js) v5 beta — Credentials + Google OAuth, JWT sessions
- **Motion:** Framer Motion

## Features

- **Catalog** — homepage, `/shop` with search, category filters and sorting, `/shop/[category]`, product detail pages
- **Cart & wishlist** — persisted client-side with out-of-stock awareness
- **Checkout** — validated address capture with Nigerian state/city selects, live delivery estimates, payment gateway redirect
- **Delivery quotes** — Terminal Africa (TShip) live rates, store shipping-zone rates (WooCommerce), or mock demo rates
- **Payments** — Paystack or Flutterwave (or a demo/no-op provider)
- **Accounts** — email + password sign-up and sign-in with 6-digit email OTP verification, Google sign-in, forgot/reset password, `My Account` and `My Orders` dashboards
- **Orders** — WooCommerce orders created at checkout, order history fetched per customer, order-confirmation screen

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A WooCommerce site with the **WooCommerce Store API** (public) and **WooCommerce REST API** v3 credentials (consumer key/secret)
- Optional: Google OAuth app, Brevo API key, TShip (Terminal Africa) key, Paystack/Flutterwave keys

### Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The development server reads `.env.local` at boot — **restart `npm run dev` after changing environment variables**.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (`next build`) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type-check |

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is gitignored — never commit real secrets.

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL` | Public WooCommerce Store API base (catalog/cart) |
| `WOOCOMMERCE_REST_URL` | Server-side WooCommerce REST v3 base (`.../wp-json/wc/v3`) |
| `WOOCOMMERCE_CONSUMER_KEY` / `WOOCOMMERCE_CONSUMER_SECRET` | REST API credentials (customers, orders, auth) |
| `AUTH_SECRET` | NextAuth JWT signing secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth app credentials |
| `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` | `"true"` shows the "Continue with Google" button |
| `NEXT_PUBLIC_APP_URL` | Public base URL (password-reset links, payment callbacks) |
| `BREVO_API_KEY` / `SMTP_FROM` | Transactional email (OTP, reset links) via Brevo |
| `PAYMENT_PROVIDER` | `paystack`, `flutterwave`, or unset/demo |
| `PAYSTACK_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` | Gateway secret keys |
| `SHIPPING_PROVIDER` | `tship`, `woocommerce`, or unset → `mock` |
| `TERMINAL_API_KEY` / `TERMINAL_API_BASE` | Terminal Africa TShip credentials |
| `SHIPPING_PICKUP_*` | Store pickup origin used for delivery quotes |
| `SHIPPING_ITEM_WEIGHT_KG` | Per-unit parcel weight (kg) used in quotes |
| `SHIPPING_FALLBACK` | `mock` → fall back to demo rates on provider errors |

See `.env.example` for the full list with comments.

## Project structure

```
src/
├── app/
│   ├── api/                 # Route handlers
│   │   ├── account/         # register, verify-email, resend-otp,
│   │   │                    # forgot-password, reset-password
│   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   ├── checkout/        # Create WC order + initialize payment
│   │   ├── locations/       # Nigerian states/cities
│   │   ├── payment/verify/  # Verify payment after gateway redirect
│   │   ├── products/        # Store API product listing
│   │   ├── shipping/quotes/ # Delivery quotes
│   │   └── webhooks/payment/# Payment status webhook
│   ├── (pages)              # /, /shop, /product/[slug], /cart, /checkout,
│   │                        # /orders, /account, /login, /register, /verify-email, …
│   ├── auth.ts              # NextAuth config (Credentials + Google, callbacks)
│   └── layout.tsx / globals.css
├── components/              # UI components (layout, cart, product, auth, forms, sections)
├── data/                    # Static/site content (products, site config)
├── lib/                     # Server logic: woocommerce-auth, otp-store, email,
│                            # reset-token-store, auth.actions, woocommerce-orders
├── services/                # Feature services
│   ├── product.service.ts   # Catalog via Store API (mock fallback)
│   ├── order.service.ts     # Checkout item validation
│   ├── shipping/            # shipping.service (provider switch), tship.service,
│   │                        # woocommerce.service
│   └── payment/             # payment.service (Paystack/Flutterwave/demo), types
├── store/                   # Zustand stores (cart, wishlist)
└── types/                   # Shared TypeScript types
```

## Architecture

```text
Pages/components  →  feature & service contracts  →  WooCommerce / gateway APIs
```

- Catalog content and business data live in typed data/services (`src/data`, `src/services`), never hardcoded into presentational components.
- Public, read-only catalog data is served via the WooCommerce **Store API**.
- Server-only operations (customer creation, orders, order history, delivery arrangement) call the WooCommerce **REST v3 API** with `WOOCOMMERCE_CONSUMER_KEY`/`SECRET` — never exposed to the client.
- Orders are created server-side at checkout and the authoritative total (from the created WooCommerce order) is used to initialize payment. Payment succeeds only when the gateway verification matches the stored reference.

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session + providers |
| `/api/account/register` | POST | Create customer + send OTP |
| `/api/account/verify-email` | POST | Verify 6-digit OTP, mark email verified |
| `/api/account/resend-otp` | POST | Re-send verification code |
| `/api/account/forgot-password` | POST | Email a password-reset link |
| `/api/account/reset-password` | POST | Set a new password with a valid token |
| `/api/checkout` | POST | Create WooCommerce order + initialize payment |
| `/api/payment/verify` | GET | Verify payment after gateway redirect |
| `/api/webhooks/payment` | POST | Payment status webhook receiver |
| `/api/shipping/quotes` | POST | Delivery rate quotes for a destination |
| `/api/products` | GET | Product listing from the Store API |
| `/api/locations` | GET | Nigerian states/cities |

## Documentation

- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) — sign-up/sign-in, Google OAuth, OTP, password reset, session/header behavior
- [`docs/SHIPPING.md`](docs/SHIPPING.md) — delivery providers, quote flow, TShip contract details
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — gateway providers, initialization/verification/webhooks
- [`docs/ORDERS.md`](docs/ORDERS.md) — checkout-to-order lifecycle, `My Orders` dashboard
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — design/business source-of-truth map (Figma + live site)

## Known limitations

- OTP codes and password-reset tokens are held in **in-memory Maps** (`src/lib/otp-store.ts`, `src/lib/reset-token-store.ts`) and reset on server restart. Persist them (e.g. Redis/DB) before production deployment.
- Frontend-driven checkout creates orders via direct REST calls; the store's native checkout plugin behaviour is not replicated.
- Some debug `console.log` statements remain in the checkout route.