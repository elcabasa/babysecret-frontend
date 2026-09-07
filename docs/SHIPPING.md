# Delivery / Shipping

Delivery quotes are produced by a small provider layer in `src/services/shipping/`. Quotes are fetched live at checkout (and reused server-side at order creation) rather than computed on the client.

Key modules:

- `shipping.service.ts` — provider switch + `getDeliveryQuotes` / `arrangeShipment`
- `tship.service.ts` — Terminal Africa TShip provider
- `woocommerce.service.ts` — WooCommerce shipping-zone provider (rates via the Store API cart)
- `src/app/api/shipping/quotes/route.ts` — quote endpoint used by the checkout form

## Provider selection

`SHIPPING_PROVIDER` decides the active provider:

| Value | Behaviour |
| --- | --- |
| `tship` | Live Terminal Africa (TShip) rates |
| `woocommerce` | Rates from the store's WooCommerce shipping zones |
| *(unset)* | `mock` demo rates (Ikeja/Lagos zones) |

On a provider error, `SHIPPING_FALLBACK=mock` can be set to fall back to demo rates so checkout never hard-blocks.

## Environment

| Variable | Purpose |
| --- | --- |
| `TERMINAL_API_KEY` | TShip API key |
| `TERMINAL_API_BASE` | TShip base URL (production default `https://api.terminal.africa/v1`; use `https://sandbox.terminal.africa/v1` to test) |
| `SHIPPING_PICKUP_*` | Store pickup origin for quotes (first/last name, email, phone, address, city, state, country, zip) |
| `SHIPPING_ITEM_WEIGHT_KG` | Per-unit parcel weight (kg); default `0.4` |
| `SHIPPING_FALLBACK` | `mock` to fall back on provider errors |

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