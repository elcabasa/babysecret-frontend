# Baby Secret Frontend

Frontend-first Baby Secret e-commerce experience built with Next.js App Router, React, TypeScript, and Tailwind CSS.

## Current status

The repository is at the discovery/foundation stage. The page and component map is documented in [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md).

The visual source of truth is the Baby Secret Figma file. The current public site at <https://babysecret.com/> is used for verified business, product, category, and terminology reference.

Figma design-context inspection is currently pending editor access for the connected Figma account. No Figma-specific visual decisions are being treated as final until that access is available.

## Planned stack

- Next.js App Router and React Server Components where appropriate
- TypeScript
- Tailwind CSS
- Lucide React
- Framer Motion
- React Hook Form and Zod
- Zustand for cart, wishlist, and global UI state
- Service abstractions with mock data, replaceable by WordPress/WooCommerce APIs later

WooCommerce is the intended backend. The owner will manage products, categories, prices, images, and stock in the WooCommerce dashboard. The frontend reads public catalog data through the WooCommerce Store API. TanStack Query is deferred until client-side live API interactions and mutations require it.

## Development

The project is currently being scaffolded. Once the package manifest is added, install dependencies and run:

```bash
npm install
npm run dev
```

## Architecture principles

```text
Pages/components -> feature and service contracts -> typed mock data
Pages/components -> same contracts -> WordPress/WooCommerce/API later
```

Product and business content must remain in typed data/services rather than being embedded in presentational components. Unconfirmed content must be marked as mock/configurable.

## Current implementation

- Responsive Figma-led homepage
- Shared responsive header and mobile navigation
- Typed product model and reusable product cards
- Mock featured-product data separated from components
- WooCommerce Store API product adapter with mock fallback
- Interactive “Build your baby's routine” selector
- Documented route, component, and data boundaries
