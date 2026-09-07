# Baby Secret Frontend — Base44 Dev Environment

## What this is

Next.js 16 (App Router, Turbopack) frontend for the Baby Secret e-commerce store.
Talks to a decoupled WordPress/WooCommerce backend for catalog, auth, orders, and payments.

## Running the app

```bash
docker compose -f docker-compose.base44.yml up -d
```

The app is served on port 3000. The dev server (Turbopack) hot-reloads on file changes.

## Environment

- `.env.base44-defaults` — local placeholder values so the app boots without credentials.
- `/run/base44/app.env` — user-provided secrets (platform-managed, outside the repo).
- Compose loads defaults first, then app.env, so real secrets always override placeholders.

## Key findings

- **WooCommerce backend at `babysecret.com` is no longer WordPress** — the domain now
  serves a Next.js app, so the Store API (`/wp-json/wc/store/v1`) and REST API
  (`/wp-json/wc/v3`) both return 404. The catalog falls back to local mock product
  data in `src/data/products.ts` (wired in `src/services/product.service.ts`).
  Login, checkout, and account features need a live WooCommerce backend.
- **AUTH_SECRET** is generated in `.env.base44-defaults` — the root layout calls
  `auth()` (NextAuth v5) on every page, so it must be set to boot.
- **Next.js `allowedDevOrigins`** is set in `next.config.ts` from
  `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can access dev assets/HMR.

## Verifying the app works

- `curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
- Homepage shows hero + 8 featured products (mock data)
- `/shop` shows product grid with categories, search, and sorting
- `/product/lotion-400` shows product detail with add-to-cart

## External secrets (all optional for boot)

See `.base44/environment.json`. None are required to boot — the catalog renders
with mock data. WooCommerce REST credentials are needed for login/checkout/account.
