# Payments

Bank Transfer is currently the ONLY customer-facing payment method. The shopper places the order, transfers the exact total to the store's receiving account, then submits their transfer details; the order stays pending (`on-hold`) until the transfer is manually verified. Paystack/Flutterwave integrations are fully intact but hidden from the UI for future re-enablement.

Key modules:

- `src/config/bank.ts` — `BANK_DETAILS` + `getBankDetails()`: the single source of truth for the receiving account (bank name, account name, account number), read by both server and UI
- `src/services/payment/payment.service.ts` — `getPaymentProvider()` + bank-transfer / Paystack / Flutterwave / demo providers
- `src/services/payment/payment.types.ts` — shared provider contracts
- `src/app/api/checkout/route.ts` — creates the order and initializes payment
- `src/app/awaiting-payment/page.tsx` — bank details, order total, transfer-confirmation flow
- `src/app/api/payment/bank-transfer/confirm/route.ts` — records transfer details, keeps the order `on-hold`
- `src/app/api/payment/verify/route.ts` — verifies card-gateway payments after redirect (only used when those gateways are re-enabled)
- `src/app/api/webhooks/payment/route.ts` — async payment-status receiver (card gateways)

## Active method: Bank Transfer

1. `POST /api/checkout` validates the payload, re-verifies the delivery quote, then creates the **WooCommerce order** (`set_paid: false`) with billing/shipping addresses, line items, `shipping_lines`, and meta including `_babysecret_paystack_reference = <reference>`.
2. The bank-transfer provider returns the receiving account + authoritative order total (from the created order, never the client). The client routes to `/awaiting-payment?reference=…&amount=…&bankName=…&accountName=…&accountNumber=…`.
3. `/awaiting-payment` shows the account details (copy buttons), the exact total, and an **"I Have Made The Transfer"** button revealing a confirmation form (transfer/payer name + transfer reference).
4. `POST /api/payment/bank-transfer/confirm` validates the details and updates the order to **`on-hold` with `set_paid: false`**, storing:
   - `_babysecret_bank_transfer_awaiting = "true"`
   - `_babysecret_bank_transfer_confirmed_at` (timestamp)
   - `_babysecret_bank_payer_name`
   - `_babysecret_bank_transfer_reference`
5. An admin verifies the transfer against the payer name/reference before processing. The frontend never marks the order paid.

## Hidden methods: Paystack / Flutterwave (kept for re-enablement)

The checkout form renders payment options from `PAYMENT_METHOD_OPTIONS` filtered by `ENABLED_PAYMENT_METHODS` (`src/components/forms/checkout-form.tsx`), currently `["bank_transfer"]`. To re-enable a gateway, add `"paystack"` / `"flutterwave"` to that list — the providers, `/api/checkout` handling, `/api/payment/verify` callback, and webhook receiver all still work.

`PAYMENT_PROVIDER` chooses the gateway for the legacy redirect flow:

| Value | Gateway |
| --- | --- |
| `paystack` | Paystack (`PAYSTACK_SECRET_KEY`) |
| `flutterwave` | Flutterwave (`FLUTTERWAVE_SECRET_KEY`) |
| *(anything else / unset)* | Demo provider — never initializes or verifies real payments |

## Environment

| Variable | Purpose |
| --- | --- |
| Bank-transfer account | Hardcoded in `src/config/bank.ts` — public receiving-account details, not a secret |
| `PAYMENT_PROVIDER` | Gateway name (`paystack` / `flutterwave`) for the redirect flow |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (server-only) |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key (server-only) |
| `WOOCOMMERCE_REST_URL` + consumer key/secret | Order CRUD |
| `NEXT_PUBLIC_APP_URL` | Base URL used for the payment callback |

## Gateway redirect sequence (Paystack/Flutterwave, when re-enabled)

1. `POST /api/checkout` creates the order as above, then initializes the gateway with the authoritative total:
   ```text
   reference    = babysecret-<timestamp>
   callback_url = {NEXT_PUBLIC_APP_URL}/api/payment/verify?reference={reference}
   ```
2. On success the API returns `{ orderId, reference, authorizationUrl }`; the client redirects the shopper to `authorizationUrl`.

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

- Never trust the client-sent amount: the payment amount always comes from the WooCommerce order `total`.
- The reference ties the payment to the WooCommerce order (`_babysecret_paystack_reference` meta).
- Receiving-account details are public by design; gateway/WooCommerce secrets stay server-only.
