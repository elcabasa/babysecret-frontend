# Payments

Payments are handled outline: the frontend creates the WooCommerce order server-side, initializes a payment with the configured gateway, redirects the shopper to the gateway, and only marks the order paid after verifying the returned reference with the gateway.

Key modules:

- `src/services/payment/payment.service.ts` — `getPaymentProvider()` + Paystack/Flutterwave/demo providers
- `src/services/payment/payment.types.ts` — shared provider contracts
- `src/app/api/checkout/route.ts` — creates the order and initializes payment
- `src/app/api/payment/verify/route.ts` — verifies payment after gateway redirect
- `src/app/api/webhooks/payment/route.ts` — async payment-status receiver

## Provider selection

`PAYMENT_PROVIDER` chooses the gateway:

| Value | Gateway |
| --- | --- |
| `paystack` | Paystack (`PAYSTACK_SECRET_KEY`) |
| `flutterwave` | Flutterwave (`FLUTTERWAVE_SECRET_KEY`) |
| *(anything else / unset)* | Demo provider — never initializes or verifies real payments |

## Environment

| Variable | Purpose |
| --- | --- |
| `PAYMENT_PROVIDER` | Gateway name (`paystack` / `flutterwave`) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key |
| `WOOCOMMERCE_REST_URL` + consumer key/secret | Order CRUD |
| `NEXT_PUBLIC_APP_URL` | Base URL used for the payment callback |

## Checkout → payment sequence

1. `POST /api/checkout` validates the payload, re-verifies the delivery quote, then creates the **WooCommerce order** with:
   - `payment_method = paystack` (provider-agnostic order creation; hook this to the selected gateway)
   - line items, billing/shipping addresses, `shipping_lines`, and meta, including `_babysecret_paystack_reference = <reference>`
2. The order's **authoritative total** (from the created order, never the client) is used to initialize the gateway with:

   ```text
   reference    = babysecret-<timestamp>
   callback_url = {NEXT_PUBLIC_APP_URL}/api/payment/verify?reference={reference}
   ```

3. On success the API returns `{ orderId, reference, authorizationUrl }`; the client redirects the shopper to `authorizationUrl`.

## Verification & order fulfilment

`GET /api/payment/verify?reference=…` (the gateway callback) does:

1. `verifyPayment(reference)` against the gateway — Paystack checks `data.status === "success"`; Flutterwave also matches `tx_ref` and `currency === "NGN"`.
2. Failure → redirect to `/checkout?payment=failed&reference=…`.
3. Looks up the WooCommerce order by `_babysecret_paystack_reference` meta.
4. If the order carries a `_babysecret_tship_rate_id`, arranges the shipment with TShip and stores `_babysecret_tship_shipment_id` / `_babysecret_tship_tracking`.
5. Marks the order `processing` and `set_paid: true` with `transaction_id = reference`.
6. Redirects the shopper to `/order-confirmation?reference=…`.

### Webhook receiver

`POST /api/webhooks/payment` is the async status receiver (gateway webhook → optional double-check of payment state and order status updates).

## Notes

- Never trust the client-sent amount: the gateway amount always comes from the WooCommerce order `total`.
- The reference ties the Paystack/Flutterwave transaction to the WooCommerce order (`_babysecret_paystack_reference` meta).