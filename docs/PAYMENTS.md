# Payments

Bank Transfer is the only payment method shown to customers. Paystack and Flutterwave remain fully implemented but hidden, so they can be re-enabled without rebuilding the payment integration.

Key modules:

- `src/services/payment/payment.service.ts` — provider selection and Bank Transfer, Paystack, Flutterwave, and demo providers
- `src/services/payment/payment.types.ts` — shared provider contracts
- `src/components/forms/checkout-form.tsx` — visible payment options and checkout submission
- `src/app/api/checkout/route.ts` — order creation and payment initialization
- `src/app/awaiting-payment/page.tsx` — transfer instructions and transfer-claim form
- `src/app/api/payment/bank-transfer/details/route.ts` — authoritative order total and receiving account
- `src/app/api/payment/bank-transfer/confirm/route.ts` — transfer-claim recording
- `src/app/api/payment/verify/route.ts` — card-gateway callback, used only if those gateways are visible again
- `src/app/api/webhooks/payment/route.ts` — signed card-gateway webhook receiver

## Current customer payment

Current customer payment:

- Bank Transfer

Retained but hidden:

- Paystack
- Flutterwave

The checkout UI filters `PAYMENT_METHOD_OPTIONS` through `ENABLED_PAYMENT_METHODS` in `src/components/forms/checkout-form.tsx`. That list is currently:

```ts
["bank_transfer"]
```

## Bank-transfer flow

```text
Customer places order
→ WooCommerce order unpaid/on-hold
→ bank details displayed
→ customer transfers money
→ customer clicks "I've Made the Transfer"
→ transfer claim recorded
→ order remains unpaid/on-hold
→ admin verifies bank payment
→ admin changes order to Processing
→ WooCommerce sends payment/order confirmation
```

Details:

1. `POST /api/checkout` creates an unpaid WooCommerce order with `set_paid: false`.
2. The Bank Transfer provider returns `awaiting_transfer` with the receiving account and authoritative WooCommerce order total.
3. Next.js emails custom awaiting-payment instructions containing the exact receiving account, payment reference, total, fulfillment details, and verification explanation.
4. The customer is routed to `/awaiting-payment?reference=…`. The authoritative total and account are re-read through `GET /api/payment/bank-transfer/details`; only the opaque reference travels in the URL.
5. The customer transfers the exact amount and submits the payer/transfer name plus transfer reference.
6. `POST /api/payment/bank-transfer/confirm` records:
   - `_babysecret_bank_transfer_awaiting = "true"`
   - `_babysecret_bank_transfer_confirmed_at`
   - `_babysecret_bank_payer_name`
   - `_babysecret_bank_transfer_reference`
7. The order remains `on-hold` with `set_paid: false`.
8. The route sends the custom admin transfer-claim notification.
9. An administrator verifies the funds in the bank account, then moves the WooCommerce order to Processing.
10. WooCommerce + FluentSMTP sends the canonical customer Processing Order confirmation.

**The frontend must never mark a bank transfer as paid.** “I’ve Made the Transfer” records a claim; only verified WooCommerce status means payment.

## Bank details configuration

Server-side receiving-account configuration:

- `MONIEPOINT_BANK_NAME`
- `MONIEPOINT_ACCOUNT_NAME`
- `MONIEPOINT_ACCOUNT_NUMBER`

There are no hardcoded fallbacks. Missing or blank values throw `BankDetailsNotConfiguredError` instead of displaying a potentially wrong account.

Client display fallback:

- `NEXT_PUBLIC_BANK_NAME`
- `NEXT_PUBLIC_BANK_ACCOUNT_NAME`
- `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER`

The awaiting-payment page prefers the server lookup response. The public variables are only a display fallback, and a failed lookup withholds transfer instructions rather than showing a partial unverified view.

Current customer-visible receiving account:

- Bank: **MoniePoint**
- Account name: **Flawless Cosmetics Limited**
- Account number: **8262328039**

These are intentionally customer-visible business details. They are not API credentials, and no API credential may be added to customer-visible configuration.

See [`ENVIRONMENT.md`](ENVIRONMENT.md) for public versus server-only handling.

## Hidden Paystack/Flutterwave integrations

Their code remains preserved for future re-enablement:

- Provider initialization and verification in `payment.service.ts`.
- Checkout handling for gateway authorization URLs.
- `/api/payment/verify` callback handling.
- `/api/webhooks/payment` signature verification and provider re-verification.
- Successful gateway verification updates the matching WooCommerce order to `processing` with `set_paid: true`; for TShip delivery orders, shipment arrangement uses the stored rate.

To re-enable a hidden gateway through the existing configuration:

1. Add `"paystack"` and/or `"flutterwave"` to `ENABLED_PAYMENT_METHODS` in `src/components/forms/checkout-form.tsx`.
2. Configure the corresponding server-only secret in the deployment environment.
3. If Flutterwave webhooks will be used, configure `FLUTTERWAVE_WEBHOOK_SECRET_HASH`.
4. Test the full redirect, callback, webhook, order-status, and canonical-email path in a non-production environment first.
5. Do not delete the Bank Transfer implementation when re-enabling another method unless the business explicitly retires it.

## Payment email responsibilities

Next.js sends only custom payment-related messages:

- Customer order acknowledgment.
- Customer awaiting-payment instructions for unpaid Bank Transfer orders.
- Admin bank-transfer claim notification.

WooCommerce + FluentSMTP sends canonical lifecycle messages. Next.js does not duplicate Processing, Completed, New Order, Cancelled, or Failed messages.

Full email ownership is documented in [`EMAIL.md`](EMAIL.md). Webhook setup and order lifecycle are documented in [`ORDERS.md`](ORDERS.md).
