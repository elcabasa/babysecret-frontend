# Pickup

Pickup is a separate fulfillment method for customers who collect their orders in person. It bypasses Terminal Africa completely.

## Current pickup location

- **Name:** Flawless Plaza
- **Address:** At the back of IMO Plaza, International Trade Fair Complex, Lagos, Nigeria
- **City:** Lagos
- **State:** Lagos
- **Country:** Nigeria
- **Fee:** Free
- **Location ID:** `flawless-plaza`

The checkout UI displays the configured location name, full address, and `Pickup: Free`. The order summary also shows fulfillment as `Pickup`, followed by the selected location and free pickup status.

## How pickup works

1. Pickup is a separate fulfillment method from delivery.
2. Pickup does not call Terminal Africa.
3. Pickup does not require a delivery quote.
4. The customer selects only a pickup location ID.
5. The server resolves the trusted location name, address, and fee from `src/config/pickup.ts`.
6. The client cannot change the pickup fee or address.
7. An unknown location ID is rejected with HTTP `400` and no order is created.
8. Pickup orders store WooCommerce pickup metadata.
9. Pickup information is also included in the WooCommerce customer note where applicable.

Key modules:

- `src/config/pickup.ts` — trusted pickup configuration and server-side lookup
- `src/app/api/pickup-locations/route.ts` — public configured-location response
- `src/components/forms/pickup-locations.tsx` — customer location picker
- `src/components/cart/checkout-summary.tsx` — pickup location and fee display
- `src/store/fulfillment.store.ts` — delivery/pickup selection state
- `src/app/api/checkout/route.ts` — server-side pickup resolution and order creation

## WooCommerce pickup data

A pickup order uses:

```text
shipping_lines.method_id = babysecret_pickup
method_title = Pickup — Flawless Plaza
total = 0
```

It also stores:

- `_babysecret_fulfillment_method = pickup`
- `_babysecret_pickup_location_id = flawless-plaza`
- `_babysecret_pickup_location_name = Flawless Plaza`
- `_babysecret_pickup_location_address = At the back of IMO Plaza, International Trade Fair Complex, Lagos, Nigeria`
- `_babysecret_pickup_fee = 0`

Checkout prefixes the collection name and address to `customer_note`, while preserving any shopper-supplied note, so standard WooCommerce/YayMail templates can display the collection point without custom order-meta handling.

Pickup orders store no Terminal `rate_id` and never call `arrangeShipment()`.

## Adding another pickup location

Add another entry to `PICKUP_LOCATIONS` in `src/config/pickup.ts`:

```ts
{
  id: "example-plaza",
  name: "Example Plaza",
  address: "123 Example Street",
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  fee: DEFAULT_PICKUP_FEE,
},
```

Rules:

- Use a stable, URL-safe `id`.
- Put the customer-facing name and address only in configuration, not in a React component.
- Let the fee default to `DEFAULT_PICKUP_FEE` unless a location genuinely charges for collection.
- Include optional `openingHours`, `phone`, latitude, or longitude only when they are confirmed business details.
- No UI changes are required: `GET /api/pickup-locations` exposes the new entry and checkout resolves it server-side.

Related documentation: [`SHIPPING.md`](SHIPPING.md), [`ORDERS.md`](ORDERS.md), [`ENVIRONMENT.md`](ENVIRONMENT.md).
