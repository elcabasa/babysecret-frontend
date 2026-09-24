# Delivery / Shipping

Delivery quotes are produced by a small provider layer in `src/services/shipping/`. Quotes are fetched live at checkout (and reused server-side at order creation) rather than computed on the client.

Key modules:

- `shipping.service.ts` — enabled-provider list + `getDeliveryQuotes` / `arrangeShipment`
- `tship.service.ts` — Terminal Africa TShip provider (currently the only active provider)
- `shipbubble.service.ts` — Shipbubble provider (fully implemented, currently disabled — no API calls made)
- `woocommerce.service.ts` — WooCommerce shipping-zone provider (rates via the Store API cart)
- `src/app/api/shipping/quotes/route.ts` — quote endpoint used by the checkout form

## Provider selection

`ENABLED_SHIPPING_PROVIDERS` in `shipping.service.ts` is the single switch for customer-facing providers — currently `["tship"]` (Terminal Africa only). `SHIPPING_PROVIDER` is honored only if it names an enabled provider; anything else falls back to `tship`.

| Value | Behaviour |
| --- | --- |
| `tship` | Live Terminal Africa (TShip) rates |
| `shipbubble` | Live Shipbubble rates — only once re-added to `ENABLED_SHIPPING_PROVIDERS` (account pending live-mode approval); otherwise ignored |
| `woocommerce` | Rates from the store's WooCommerce shipping zones — only once enabled in `ENABLED_SHIPPING_PROVIDERS`; otherwise ignored |

To re-enable Shipbubble later, add `"shipbubble"` to `ENABLED_SHIPPING_PROVIDERS`. No other code changes needed — the implementation, `sb:` rate-id routing in `arrangeShipment`, and order-meta handling are intact.

Quotes come ONLY from the active provider: there is no automatic fallback between providers. Provider errors and empty results surface to the shopper as the friendly message **"Delivery is currently unavailable for this location."** — never raw provider errors, and the delivery selector is only rendered when quotes exist (no broken/empty selector).

## Environment

| Variable | Purpose |
| --- | --- |
| `TERMINAL_API_KEY` | TShip API key |
| `TERMINAL_API_BASE` | TShip base URL (production default `https://api.terminal.africa/v1`; use `https://sandbox.terminal.africa/v1` to test) |
| `SHIPPING_PICKUP_*` | Store pickup origin for quotes (first/last name, email, phone, address, city, state, country, zip) |
| `SHIPPING_ITEM_WEIGHT_KG` | Per-unit parcel weight (kg); default `0.4` |
| `SHIPPUBBLE_API_KEY` / `SHIPPUBBLE_API_BASE` | Shipbubble credentials (kept for re-enablement; currently unused) |

The pickup origin details apply to the TShip provider. `SHIPPING_PICKUP_EMAIL` and `SHIPPING_PICKUP_PHONE` must be non-empty for TShip.

## Quote flow

1. The checkout form submits customer delivery details to `POST /api/shipping/quotes` (parcel items, destination).
2. `getDeliveryQuotes` resolves the provider and returns quotes:

   ```ts
   type DeliveryQuote = {
     rateId: string;
     carrierName: string;
     service?: string;
     amount: number; // ₦
     deliveryPeriod?: string;
     currency: string;
   };
   ```

3. At checkout (`POST /api/checkout`), the selected quote is **re-verified server-side**: `verifyDeliveryQuote` re-runs `getDeliveryQuotes` and matches the chosen carrier/amount. A mismatch returns `409` and the shopper must re-pick.
4. The verified rate becomes the order's `shipping_lines` and is stored in order meta.

## TShip contract details

- **`line2` is required** by TShip — the apartment value is sent as `line2`, falling back to `line1` when absent.
- Nigerian phone numbers must be international: a local `080…` (11-digit) or `0…`-less 10-digit number is normalized to `+234…` automatically.
- TShip sandbox keys work against `https://sandbox.terminal.africa/v1`; switching between sandbox and production keys requires changing `TERMINAL_API_BASE`.

## Order meta written by the checkout

Generic shipping meta is always written when a delivery option is chosen:

- `_babysecret_shipping_rate_id`, `_babysecret_shipping_carrier`, `_babysecret_shipping_service`, `_babysecret_shipping_amount`

In TShip mode, `method_id` is `terminal_tship` and TShip-specific meta is additionally written:

- `_babysecret_tship_rate_id`, `_babysecret_tship_carrier`, `_babysecret_tship_service`, `_babysecret_tship_amount`

Shipment arrangement and tracking (paid orders) are handled in the payment-verification flow.