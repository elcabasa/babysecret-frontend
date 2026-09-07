# Orders

A customer's purchase history is stored in WooCommerce and surfaced in the app for the storefront and the customer's "My Orders" dashboard.

Key modules:

- `src/services/order.service.ts` — client-item validation / demo order creation
- `src/app/api/checkout/route.ts` — order creation at checkout
- `src/lib/woocommerce-orders.ts` — `getCustomerOrders(customerId)`
- `src/app/orders/page.tsx` — "My Orders" dashboard
- `src/app/order-confirmation/page.tsx` — post-payment confirmation

## Checkout → order lifecycle

1. **Validation** — `validateCheckoutItems` re-fetches each product server-side and rejects unavailable items (`out-of-stock` / non-purchasable) and recalculates prices (flagging changes).
2. **Order creation** — `POST /api/checkout` creates a WooCommerce order (`set_paid: false`) with billing/shipping addresses, line items, `shipping_lines`, customer note, and metadata (`_babysecret_paystack_reference`, shipping meta; see [`SHIPPING.md`](SHIPPING.md)).
3. **Payment** — the authoritative order total initializes the gateway; see [`PAYMENTS.md`](PAYMENTS.md).
4. **Verification** — on successful payment the order is flipped to `processing` / `set_paid: true` and (for TShip rates) a shipment is arranged.
5. **Confirmation** — the shopper lands on `/order-confirmation?reference=…`.

## "My Orders" dashboard

`/orders` is a server-side protected route (`auth()` → redirect to `/login` when unauthenticated). It fetches the customer's order history from WooCommerce **by the authenticated customer id**:

```ts
GET {WOOCOMMERCE_REST_URL}/orders?customer={session.user.id}&per_page=50
```

with `Basic` auth from `WOOCOMMERCE_CONSUMER_KEY` / `WOOCOMMERCE_CONSUMER_SECRET` and `cache: "no-store"` so data is always fresh.

### Security / account isolation model

- The customer id comes **only** from the authenticated server-side NextAuth session (`session.user.id`, the WooCommerce customer id) — never from the browser, query params, or local storage.
- The WooCommerce `customer` filter isolates orders server-side. `email` is deliberately **not** used: the WooCommerce REST API silently ignores `email` on the orders list endpoint and returns the latest orders of *every* customer — a confirmed data-leak vector this code no longer relies on.
- **Defense in depth:** `getCustomerOrders` re-verifies every returned order's `customer_id` matches the session customer and drops anything else, so even a downstream misconfiguration cannot leak another user's orders.
- **Order linkage at checkout:** when an authenticated user places an order, `POST /api/checkout` links it via `customer_id` read server-side from the session. Guest checkouts remain unlinked (`customer_id = 0`) and do not appear in any "My Orders" list.

The view renders a responsive grid table:

| Column | Source |
| --- | --- |
| Order ID | `order.number` (e.g. `#1234`) |
| Date | `order.date_created` (localized `en-NG`) |
| Status | `order.status` → mapped pill (Processing, Completed, On Hold, Pending Payment, Cancelled, Refunded, Failed) |
| Total | `order.total` via `formatPrice` (₦) |

States:

- **Empty history** → *"You haven't placed any orders yet."* with a Shop Now link to `/shop`.
- **Fetch failure** → friendly error panel with a Continue Shopping link.

### Entry points

The header profile dropdown ("My Orders" — see [`AUTHENTICATION.md`](AUTHENTICATION.md)) and the `/account` dashboard both link here.

## Notes

- Order history is scoped to the **authenticated WooCommerce customer id**; orders placed before customer-linkage was added (guest orders, `customer_id = 0`) are not shown to keep isolation strict.
- The demo/placeholder order path (`createDemoOrder`) exists in `order.service.ts` for local development without WooCommerce; the real checkout always creates a genuine WooCommerce order.