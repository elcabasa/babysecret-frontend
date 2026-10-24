# Orders

WooCommerce owns orders and order status. The Next.js frontend collects checkout selections, creates the WooCommerce order server-side, links authenticated orders to the customer, and displays order history. Canonical order email is sent by WooCommerce; Next.js sends only the custom notifications documented in [`EMAIL.md`](EMAIL.md).

Key modules:

- `src/app/api/checkout/route.ts` — validates checkout and creates delivery or pickup orders
- `src/lib/woocommerce-orders.ts` — order reads/writes: `getCustomerOrders`, `getWooOrderById`, `getWooOrderByReference`, `updateWooOrder`, `appendWooOrderMeta`, `metaValue`
- `src/services/order.service.ts` — unused checkout-validation/demo helpers retained in the repository but not called by live checkout
- `src/app/orders/page.tsx` — "My Orders" dashboard
- `src/app/order-confirmation/page.tsx` — post-payment confirmation
- `src/app/api/webhooks/woocommerce/order/route.ts` — verified WooCommerce order-update receiver

## Checkout → order lifecycle

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

1. **Checkout validation** — `POST /api/checkout` validates the request shape with Zod. Delivery requires a selected Terminal Africa quote; pickup requires a configured pickup location ID. `src/services/order.service.ts` contains older validation/demo helpers, but live checkout does not call them.
2. **Quote/weight verification** — delivery re-resolves authoritative WooCommerce parcel weights and re-requests Terminal Africa quotes. Only a currently valid carrier/amount combination is accepted. Pickup skips Terminal Africa entirely.
3. **Order creation** — checkout creates an unpaid WooCommerce order with `set_paid: false`, billing/shipping addresses, line items containing only WooCommerce `product_id` and `quantity`, `shipping_lines`, customer note, and fulfillment metadata. The authoritative total is read back from WooCommerce and used for payment initialization; the browser-submitted amount is never trusted.
4. **Payment initialization** — Bank Transfer returns `awaiting_transfer` with the receiving account and authoritative total. Hidden card-gateway paths remain implemented for future re-enablement; see [`PAYMENTS.md`](PAYMENTS.md).
5. **Custom Next.js email** — a new order receives the customer-facing order acknowledgment. A new unpaid Bank Transfer order also receives awaiting-payment instructions. WooCommerce remains responsible for canonical lifecycle messages.
6. **Bank-transfer confirmation** — the customer submits payer and transfer-reference details. Checkout records the claim and keeps the order `on-hold` with `set_paid: false`. The frontend never marks it paid.
7. **Admin verification** — an administrator verifies the transfer and moves the WooCommerce order to Processing. WooCommerce sends the canonical Processing Order confirmation.

Pickup orders use `method_id: babysecret_pickup`, store the configured location metadata, and prefix the collection point to `customer_note`; see [`PICKUP.md`](PICKUP.md).

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

## WooCommerce order webhook

WooCommerce notifies Next.js of order changes through:

```text
POST https://babysecret.com/api/webhooks/woocommerce/order
```

WooCommerce topic:

```text
Order updated
```

The endpoint preserves verified webhook plumbing and dispatches only custom Next.js notifications that WordPress does not send—currently optional shipping-plugin `order_shipped` notices. Canonical order statuses intentionally produce no Next.js message because WooCommerce + FluentSMTP sends them.

Verification behavior:

- The raw request body is read before JSON parsing because HMAC verification must use WooCommerce’s exact signed bytes.
- The `X-WC-Webhook-Signature` header is verified with HMAC-SHA256.
- Comparison uses `crypto.timingSafeEqual`.
- Verification uses the dedicated server-only `WOOCOMMERCE_WEBHOOK_SECRET`, independently from WooCommerce REST credentials.
- Missing signatures are rejected with `401`.
- Invalid signatures are rejected with `401`.
- A missing webhook secret is rejected with `500`.
- Malformed JSON is rejected with `400`.
- A missing or unusable order ID is rejected with `400`.
- An unreadable order is rejected with `404`.
- Valid custom shipped events are deduplicated through `_babysecret_emails_sent`; repeats do not resend.
- A successful authenticated request returns `{ received: true, status }`.
- WooCommerce’s GET validation request receives `{ ok: true }` and never triggers email.

### WooCommerce admin webhook setup

1. In WordPress admin go to **WooCommerce → Settings → Advanced → Webhooks**.
2. Click **Add webhook**.
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Name | `Baby Secret Order Updated` |
   | Status | `Active` |
   | Topic | `Order updated` |
   | Delivery URL | `https://babysecret.com/api/webhooks/woocommerce/order` |
   | Secret | The exact value of the `WOOCOMMERCE_WEBHOOK_SECRET` environment variable |

4. Click **Save**. WooCommerce immediately performs a validation request; the row shows "Delivered" with an `Action received` log entry.

Leave **Request headers** empty and **Request body** set to *Default payload* — the endpoint reads the standard order payload and re-fetches the order itself.

### Environment variables and redeploys

Add this to **Vercel → Project → Settings → Environment Variables** (Production, and Preview if webhooks should work on preview deployments):

```text
WOOCOMMERCE_WEBHOOK_SECRET=<random 32+ character string>
```

Generate a value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The **same** value must be in the Vercel environment and in the WooCommerce webhook Secret field. Changing an environment variable in Vercel has **no effect until you redeploy** — Vercel bakes env vars into the build. Use Vercel → Project → Deployments → ⋮ → Redeploy (or push a new commit).

### Response behaviour

| Situation | Status | Body |
| --- | --- | --- |
| Signature valid, order read successfully | `200` | `{"received":true,"status":"processing"}` |
| `WOOCOMMERCE_WEBHOOK_SECRET` not set in the environment | `500` | `{"message":"Webhook not configured."}` |
| `X-WC-Webhook-Signature` header absent | `401` | `{"message":"Missing signature."}` |
| Signature does not match | `401` | `{"message":"Invalid signature."}` |
| Body is not valid JSON | `400` | `{"message":"Invalid payload."}` |
| No usable `id` in the payload | `400` | `{"message":"Missing order id."}` |
| Order could not be read from WooCommerce | `404` | `{"message":"Order not found."}` |

A `200` means the request was authenticated and the order was found — the emails themselves are dispatched best-effort and never change the HTTP status, so a mail outage never makes WooCommerce retry the delivery.

### Inspecting delivery logs

- **In WooCommerce:** WooCommerce → Settings → Advanced → Webhooks → hover the webhook → **View log**. Each delivery shows the request URL, headers, body and the response code.
- **In Vercel:** Project → Logs → filter `webhook`. Server-side rejections are logged as `[webhook] …` (e.g. `Rejected WooCommerce webhook with an invalid signature.`). These messages never include the secret.
- **Email troubleshooting:** filter Vercel logs for `[email]`. A send failure logs the subject, recipients and the transport error — never the credentials.

## Notes

- Order history is scoped to the **authenticated WooCommerce customer id**; guest orders (`customer_id = 0`) are not shown to keep isolation strict.
- `src/services/order.service.ts` validation/demo helpers are retained but are not part of the live checkout path; do not describe them as active checkout validation.
