# Testing checklist

Run these checks before calling a change production-ready. Use controlled test data everywhere; never place an uncontrolled real customer order, and never expose credentials in screenshots, logs, or chat output.

## Local testing

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

- `npm run lint` — no ESLint errors.
- `npm run typecheck` — `tsc --noEmit` passes.
- `npm run build` — production build compiles and generates all routes.
- `git diff --check` — no whitespace errors.
- `git status` — no `.env*` secret file (other than `.env.example`) is staged.

## Browser testing — products

- [ ] Catalog loads with categories, sorting, and search.
- [ ] Search returns relevant results and a clean no-results state.
- [ ] Product page shows gallery, variants, quantity, and cart/wishlist actions.
- [ ] Cart add/update/remove/quantity controls work and the summary totals correctly.

## Browser testing — checkout

- [ ] Valid delivery address returns Terminal Africa quotes.
- [ ] Selecting a quote updates the summary total.
- [ ] An address with no Terminal quote shows "We couldn't find an automatic delivery option for this address" with **Switch to Pickup** and **Request Delivery Assistance** — and no provider error text.
- [ ] Switch to Pickup sets fulfillment to pickup without another Terminal Africa call.
- [ ] Flawless Plaza pickup shows name, full address, and `Pickup: Free`.
- [ ] Bank Transfer is the only visible payment method; no card-gateway option renders.

## Browser testing — weight

- [ ] Product with a valid WooCommerce weight uses that weight.
- [ ] Product with missing weight uses `0.5` kg without a customer-facing technical error.
- [ ] Quantity multiplies the unit weight (e.g. `0.7 kg × 2 = 1.4 kg`).
- [ ] Multiple products resolve independently.
- [ ] Variation with its own weight uses the variation weight.
- [ ] Mixed weighted/unweighted cart totals correctly (e.g. `0.7×2 + 0.5×3 = 2.9 kg`).
- [ ] Server logs show product ID, resolved weight, quantity, and total parcel weight — and no secrets.

## Browser testing — payment

- [ ] Bank-transfer checkout creates an unpaid order and shows the receiving account with the exact total.
- [ ] "I've Made the Transfer" records payer/transfer reference and keeps the order `on-hold` / unpaid.
- [ ] Transfer confirmation never marks the order paid in WooCommerce.
- [ ] After an admin moves the order to Processing, the canonical Processing email fires (no Next.js duplicate).

## Browser testing — email

- [ ] OTP email arrives after registration and verifies the account.
- [ ] Password-reset email arrives; the link works once and a reused link is rejected.
- [ ] New order triggers the customer order acknowledgment.
- [ ] Bank-transfer order triggers awaiting-payment instructions with account, reference, and total.
- [ ] Transfer confirmation triggers the admin claim notification only.
- [ ] Processing/completed orders trigger canonical WooCommerce messages with no Next.js duplicates.

## Browser testing — webhook

- [ ] Valid signature + known order → `200`.
- [ ] Invalid signature → `401`, no email dispatched.
- [ ] Missing signature → `401`.
- [ ] Missing server secret → `500` (fix the deployment, not the request).
- [ ] Duplicate delivery of the same event → no duplicate custom email.

## Browser testing — mobile

- [ ] Mobile navigation opens and reaches shop, account, and cart.
- [ ] Checkout form, delivery panel, assistance form, and pickup picker fit a 390 px viewport with no horizontal scroll.
- [ ] Bank-transfer awaiting-payment page shows amount, account details, and the confirmation form on mobile.

## Production smoke testing

After deploying, run a controlled production checkout and email test, then verify the test order in WooCommerce and clean up any test data per store policy.
