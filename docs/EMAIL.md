# Email

Baby Secret has two separate email layers. WooCommerce owns canonical order-lifecycle mail. Next.js owns only custom application mail that WooCommerce does not already send.

```text
WooCommerce
→ FluentSMTP
→ Titan Email
→ hello@babysecret.com
```

```text
Next.js
→ Nodemailer
→ Titan SMTP
```

## WooCommerce canonical emails

WooCommerce + FluentSMTP remains responsible for canonical order-lifecycle messages, including the production:

- New Order messages
- Processing Order messages
- Completed Order messages
- Cancelled Order messages
- Failed Order messages

These are sent from WordPress through FluentSMTP and Titan Email. Next.js must not send duplicate versions of them.

After an administrator moves a manually verified Bank Transfer order to Processing, WooCommerce sends the canonical customer Processing Order message.

## Custom Next.js application emails

Next.js sends only genuinely custom messages outside WooCommerce’s canonical lifecycle:

| Message | Audience | Trigger |
| --- | --- | --- |
| OTP verification code | Customer | Registration or OTP resend |
| Password-reset link | Customer | Forgot-password request |
| Order acknowledgment | Customer | Successful order creation |
| Awaiting-payment instructions | Customer | New unpaid Bank Transfer order |
| Transfer-claim notification | Administrator | Customer submits “I’ve Made the Transfer” |
| Delivery-assistance request | Administrator | Customer requests manual delivery help |
| Optional shipped notice | Customer | Configured custom shipping-plugin status |

The awaiting-payment message contains the exact receiving account, payment reference, order total, fulfillment details, and verification explanation. The transfer-claim message contains the payer name, transfer reference, order details, and an explicit unpaid warning.

The delivery-assistance message contains customer contact details, delivery location, cart products and quantities, catalog subtotal when available, submission time, request ID, and reference. Its body explicitly states that no order, fee, payment, shipment, or confirmation was created.

## No-duplicate rule

Next.js intentionally has no renderer for WooCommerce-owned:

- New Order
- Processing
- Completed
- Cancelled
- Failed
- Refund lifecycle messages

The WooCommerce webhook ignores those canonical statuses for Next.js dispatch. It may dispatch only an optional `order_shipped` message for configured custom shipping-plugin statuses, and only when WordPress does not already send the corresponding message.

Custom Next.js sends are recorded on the WooCommerce order in `_babysecret_emails_sent`, so reprocessing the same custom event does not duplicate it.

## Titan SMTP configuration

Custom Next.js mail uses authenticated Titan SMTP over SSL:

- Host: `smtp.titan.email`
- Port: `465`
- Encryption: SSL/implicit TLS
- Authentication: enabled mailbox authentication
- Mailbox username variable: `EMAIL_USER`
- Mailbox credential variable: `EMAIL_PASSWORD`
- Sender variable: `EMAIL_FROM`
- Admin-recipient variable: `EMAIL_ADMIN_TO`

`EMAIL_FROM` supports both:

```text
hello@babysecret.com
```

and:

```text
"Baby Secret <hello@babysecret.com>"
```

All SMTP credentials are server-only. They must never use the `NEXT_PUBLIC_` prefix. Google OAuth credentials must never be used for SMTP. There is no Brevo fallback and no legacy SMTP fallback.

If required SMTP variables are missing or blank, sending is skipped and the server logs the missing variable names without values. SMTP internals are never exposed to customers.

See [`ENVIRONMENT.md`](ENVIRONMENT.md) for required/optional handling.

## Implementation

- `src/lib/email/mailer.ts` — server-only Nodemailer transport and configuration validation
- `src/lib/email/layout.ts` — branded HTML and plain-text rendering
- `src/lib/email/customer-templates.ts` — custom customer order messages
- `src/lib/email/admin-templates.ts` — custom transfer-claim message
- `src/lib/email/delivery-assistance.ts` — custom delivery-assistance message
- `src/lib/email/order-context.ts` — WooCommerce order view model
- `src/lib/email/order-emails.ts` — custom-event dispatch and deduplication
- `src/lib/email.ts` — OTP and password-reset facade

Related documentation: [`AUTHENTICATION.md`](AUTHENTICATION.md), [`ORDERS.md`](ORDERS.md), [`PAYMENTS.md`](PAYMENTS.md).
