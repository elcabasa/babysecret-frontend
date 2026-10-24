# Architecture

Baby Secret is a Next.js storefront layered over WordPress/WooCommerce. The browser renders catalog, cart, checkout, account, and order-history UI. Next.js API routes perform privileged work. WooCommerce owns products, customers, orders, payments/order status, and canonical order-lifecycle email.

```text
Customer
  ↓
Next.js frontend
  ↓
API routes
  ↓
WooCommerce
```

## Checkout flow

```text
Customer
  ↓
Cart
  ↓
Address / fulfillment selection
  ↓
Delivery quote or pickup
  ↓
WooCommerce order creation
  ↓
Payment method
  ↓
Order status
```

1. The customer builds a cart in the browser.
2. Checkout collects contact details and either a delivery address or a pickup selection.
3. For delivery, the server resolves authoritative WooCommerce weights and requests a live Terminal Africa quote.
4. The customer selects a returned Terminal rate, or switches to pickup/requests delivery assistance when no automatic rate exists.
5. `POST /api/checkout` validates the request, re-verifies the selected delivery quote, creates an unpaid WooCommerce order, and initializes the selected payment flow.
6. Bank Transfer remains unpaid and `on-hold` until an administrator verifies the transfer and moves the order to Processing.
7. WooCommerce owns the resulting order status and canonical status-driven email.

Related details: [`ORDERS.md`](ORDERS.md), [`PAYMENTS.md`](PAYMENTS.md), [`SHIPPING.md`](SHIPPING.md), [`PICKUP.md`](PICKUP.md).

## Client-side operations

The browser is responsible for:

- Rendering catalog, search, product, cart, checkout, account, and order-history UI.
- Holding cart, wishlist, delivery-quote, fulfillment, and form state.
- Sending product IDs, variant IDs where applicable, quantities, customer details, selected Terminal `rateId`, or pickup `locationId`.
- Displaying friendly errors without provider, credential, or backend internals.

The browser is not trusted for:

- Prices or order totals.
- Shipping rates or shipping fees.
- Pickup names, addresses, or fees.
- Product weights.
- Customer identity for order-history access.
- Payment-paid status.
- Webhook authentication.

## Server-side operations

Next.js API routes and server modules are responsible for:

- Validating checkout, assistance, account, payment, and webhook payloads with Zod or the route’s existing validation approach.
- Reading the authenticated NextAuth session server-side for customer-linked operations.
- Resolving pickup details from `src/config/pickup.ts` by location ID.
- Resolving parcel weights from WooCommerce through `src/services/shipping/weight.service.ts`.
- Requesting and re-verifying Terminal Africa quotes.
- Creating and updating WooCommerce orders through the REST API.
- Resolving bank-transfer receiving-account details from server-only configuration.
- Sending only custom Next.js mail through server-only Titan SMTP.
- Verifying WooCommerce webhook signatures before acting on webhook payloads.
- Returning generic customer-facing errors while logging actionable server-side diagnostics without secrets.

## WooCommerce-side operations

WordPress/WooCommerce is responsible for:

- Product catalog, pricing, availability, weights, customers, and orders.
- Calculating and storing the authoritative order total.
- Holding order status as the source of truth.
- Sending canonical order-lifecycle email through FluentSMTP and Titan.
- Receiving the registered `order.updated` webhook deliveries.
- Hosting the JWT authentication endpoint used for customer sign-in.

## Trust boundaries

| Boundary | Untrusted input | Trusted source |
| --- | --- | --- |
| Order total | Browser cart amount | WooCommerce order `total` |
| Shipping rate | Browser-selected quote amount | Fresh server-side Terminal Africa quote |
| Pickup details | Browser location name/address/fee | `src/config/pickup.ts` resolved by location ID |
| Parcel weight | Browser-submitted weight, which the API does not accept | WooCommerce product/variation weight or the `0.5` kg fallback |
| Order ownership | Browser customer ID or email filter | NextAuth session customer ID |
| Payment completion | “I’ve Made the Transfer” or gateway redirect alone | WooCommerce paid/Processing status after verification |
| Webhook event | Webhook body alone | Raw-body HMAC signature plus a fresh WooCommerce order read |

See also [`ENVIRONMENT.md`](ENVIRONMENT.md) for public versus server-only configuration.
