# Delivery / Shipping

Terminal Africa (`tship`) is the active automatic delivery provider. Quotes are fetched live at checkout and re-verified server-side before order creation. There are no mock rates and no hardcoded delivery prices.

Current Terminal Africa base URL:

```text
https://api.terminal.africa/v1
```

Do not place the Terminal Africa API key in documentation, commits, logs, screenshots, or chat output.

Key modules:

- `src/services/shipping/shipping.service.ts` — enabled-provider list, quote dispatch, and shipment arrangement
- `src/services/shipping/weight.service.ts` — authoritative WooCommerce weight resolution and kilogram normalization
- `src/services/shipping/tship.service.ts` — Terminal Africa implementation and shipping-origin handling
- `src/services/shipping/shipbubble.service.ts` — preserved but disabled Shipbubble implementation
- `src/services/shipping/woocommerce.service.ts` — WooCommerce-zone provider implementation, not currently customer-facing
- `src/app/api/shipping/quotes/route.ts` — delivery-quote endpoint
- `src/app/api/shipping/assistance/route.ts` — manual delivery-assistance endpoint
- `src/components/forms/delivery-methods.tsx` — delivery options, unavailable state, pickup switch, and assistance entry point
- `src/components/forms/delivery-assistance-modal.tsx` — customer assistance dialog (contact + destination, prefilled from checkout state)
- `src/store/delivery.store.ts` — quote selection and quote-request state

## Active provider

`ENABLED_SHIPPING_PROVIDERS` in `src/services/shipping/shipping.service.ts` is currently:

```ts
["tship"]
```

Behavior:

1. Terminal Africa is the only automatic delivery provider offered to customers.
2. Shipbubble code and credentials remain in the repository, but Shipbubble is disabled and makes no API calls.
3. The WooCommerce-zone provider implementation remains in the repository but is not customer-facing.
4. There is no automatic fallback from Terminal Africa to another provider.
5. Provider errors and empty quote responses are shown to customers only as a friendly unavailable-delivery message.

To re-enable Shipbubble later, add `"shipbubble"` to `ENABLED_SHIPPING_PROVIDERS`. No other code changes are required for the preserved implementation path.

## Quote flow

1. The checkout form submits customer delivery details and cart items to `POST /api/shipping/quotes`, including the customer-supplied postal/ZIP code. The request does not contain a weight field.
2. The server resolves authoritative parcel weights with `resolveParcelWeights()` before calling Terminal Africa.
3. `getDeliveryQuotes()` first resolves the destination against Terminal's own city data and address validation (see below), then sends the customer address, store origin, parcel items, quantities, resolved kilogram weights, NGN values, and `weight_unit: "kg"` to Terminal Africa.
4. The customer selects one of the returned Terminal rates or, when none is available, uses pickup or delivery assistance.
5. At checkout, `POST /api/checkout` re-resolves weights, requests fresh Terminal quotes, and accepts only a currently valid carrier/amount combination. A stale or mismatched quote returns `409`.
6. Pickup orders skip quote retrieval and quote verification entirely.

## No-quote behavior

Terminal Africa may return no quote for some addresses. The UI then shows:

```text
Delivery unavailable
We couldn't find an automatic delivery option for this address.
[Switch to Pickup]
[Request Delivery Assistance]
```

Switching to pickup changes fulfillment without another Terminal Africa call. Requesting assistance opens an accessible modal dialog prefilled from the checkout form state; it does not create a quote, fee, order, or paid status.

## Delivery assistance

`POST /api/shipping/assistance` handles customers who want delivery but received no automatic rate.

It collects:

- First name
- Last name
- Email
- Phone number
- State
- City
- Delivery address
- Apartment/landmark (optional)
- Optional note
- Cart product IDs, optional variant IDs, names, and quantities

It does not accept client prices, weights, shipping fees, or payment status.

Server behavior:

1. Validates every field with Zod.
2. Generates a deterministic `DLV-XXXXX` reference from the normalized payload.
3. Reuses the browser’s idempotency key across retries and refreshes.
4. Keeps recently processed request keys in memory for 24 hours and returns the same reference without sending another admin email.
5. Resolves product names and catalog prices from the Store API only for the admin email; unknown products are listed without prices rather than blocking the request.
6. Sends one Titan SMTP admin notification to `hello@babysecret.com`.
7. Creates no WooCommerce order, shipping quote, shipping fee, paid status, shipped status, or delivery confirmation.
8. Returns `503` with a generic message if the admin email cannot be sent, so an unsent request is not reported as submitted.

The email explicitly states that the message is an assistance request and includes customer details, delivery location, cart, catalog subtotal when available, submission time, request ID, and reference.

The in-memory deduplication cache is best-effort: serverless instances do not share memory, but the deterministic reference still lets administrators recognize repeats.

## Destination address validation

For delivery, the checkout collects Country → State → **City / Delivery Area** → Street Address → Postal/ZIP. The City / Delivery Area dropdown is populated from Terminal Africa's own canonical city list (`GET /api/terminal-cities`, backed by Terminal `GET /cities` for the selected state, cached server-side for 24 hours) — never from the Nigerian LGA dataset. The Nigerian locations plugin still supplies the State list and the optional **LGA / Area** field, which is informational local-address context only (appended to the street lines for the courier/order views) and never replaces the Terminal city sent as `delivery_address.city`.

Sending a raw LGA such as "Eti-Osa" as the city makes Terminal reject the whole quote request with `Invalid city, please select one from the list of cities` — while the Terminal dashboard (which uses Terminal's own city dropdown) quotes the same area without trouble. To prevent that, both `POST /api/shipping/quotes` and `POST /api/checkout` strictly require a canonical Terminal city for Nigerian destinations and reject anything else with a friendly "select a City / Delivery Area from the list" message (a Terminal outage fails open to the normal quote attempt instead).

Before quoting, `TerminalShipProvider.getQuotes` resolves the destination in `src/services/shipping/address-resolution.ts`:

 1. Pulls canonical states/cities from Terminal itself (`GET /states`, `GET /cities?country_code=NG&state_code=…`), cached in memory for 24 hours. No coverage list is hardcoded and nothing is guessed.
 2. Matches the customer's state/city by normalized name (case/punctuation-insensitive). An exact match adopts Terminal's canonical spelling; anything else keeps the customer's value so the parcel is never silently moved. A small verified alias table covers naming differences (e.g. the store's "FCT" resolves to Terminal's actual "Abuja" record, whose real state code is then used) — aliases only ever point at a live Terminal record, and city matching stays exact-only so an LGA can never become a Terminal city.
3. Runs the resolved destination through Terminal's `POST /addresses/validate` with state, city, country, street, and the customer-supplied postal code.
4. Adopts suggested corrections only for the same city + state (postal/casing fixes). Suggestions pointing at a different city/state are logged and ignored.
5. Rewraps address lines to Terminal's 45-character `line1` limit (overflow moves to `line2`) — field layout only, never a location change.

If validation is unreachable or inconclusive, resolution fails open to the quote attempt. A Terminal `Invalid city` rejection for the *delivery* address is returned as zero rates (friendly pickup/assistance fallback); a broken *pickup* (origin) address stays a loud error because that is a configuration bug.

The customer postal/ZIP code is required for delivery — checkout and the quote endpoint reject a missing code instead of inventing one (the old `"000000"` fallback is removed).

## Parcel-weight resolution

For every submitted cart item, the server checks WooCommerce weight data:

- Fetch the product from the authenticated WooCommerce REST API:
  - `GET /wp-json/wc/v3/products/{id}`
- For a variation, fetch:
  - `GET /wp-json/wc/v3/products/{product_id}/variations/{variation_id}`
- Read the store’s configured weight unit from:
  - `GET /wp-json/wc/v3/settings/products`
- Use a valid variation weight first.
- Use the parent-product weight when the variation weight is absent or invalid.
- Use `0.5` kg when the product/variation weight is missing, blank, zero, negative, malformed, unit-unknown, or unavailable.
- `0.5` kg is the only fallback.
- The browser cannot override the result because quote and checkout schemas do not accept weight.
- Quantity multiplies the resolved unit weight.
- Weights are normalized to kilograms before Terminal Africa receives them.
- Pickup checkout never calls the resolver or Terminal Africa.

### Worked example

Cart:

- Product A: WooCommerce weight `0.7` kg, quantity `2`
- Product B: no WooCommerce weight, quantity `3`

Calculation:

```text
Product A: 0.7 kg × 2 = 1.4 kg
Product B: 0.5 kg × 3 = 1.5 kg
Total parcel weight: 2.9 kg
```

Terminal Africa receives separate per-item weights and quantities:

```json
{
  "weight_unit": "kg",
  "items": [
    { "weight": 0.7, "quantity": 2 },
    { "weight": 0.5, "quantity": 3 }
  ]
}
```

## Shipping origin configuration

Terminal Africa quotes use the store origin from these server-only variables:

- `SHIPPING_PICKUP_FIRST_NAME`
- `SHIPPING_PICKUP_LAST_NAME`
- `SHIPPING_PICKUP_EMAIL`
- `SHIPPING_PICKUP_PHONE`
- `SHIPPING_PICKUP_ADDRESS`
- `SHIPPING_PICKUP_CITY`
- `SHIPPING_PICKUP_STATE`
- `SHIPPING_PICKUP_COUNTRY`
- `SHIPPING_PICKUP_ZIP`

These describe where Terminal Africa collects parcels for delivery. They are separate from the customer-facing Flawless Plaza pickup location documented in [`PICKUP.md`](PICKUP.md).

> Terminal rejects address `line1` longer than 45 characters. Keep `SHIPPING_PICKUP_ADDRESS` short, or the app rewraps overflow onto `line2` automatically (field layout only — the location is unchanged).

To update the origin:

1. Change the `SHIPPING_PICKUP_*` values in the deployment environment.
2. Redeploy the application.
3. Request a new quote and confirm that Terminal Africa accepts the origin.

`SHIPPING_PICKUP_EMAIL` and `SHIPPING_PICKUP_PHONE` must be non-empty for Terminal Africa.

## Sandbox and live Terminal Africa configuration

| Environment | Base URL |
| --- | --- |
| Sandbox/test | `https://sandbox.terminal.africa/v1` |
| Production/live | `https://api.terminal.africa/v1` |

To switch:

1. Set `TERMINAL_API_BASE` to the matching environment URL.
2. Set `TERMINAL_API_KEY` to a key issued for that same environment.
3. Redeploy.
4. Test with an address appropriate to that environment.

Do not mix a sandbox key with the production base URL, or a production key with the sandbox base URL.

## Troubleshooting no-rate responses

When Terminal Africa returns no rates:

- Confirm the customer state, city, street address, country, and postal/ZIP code are complete.
- Confirm the store origin is complete and accepted by Terminal Africa — in particular that the origin street fits Terminal's 45-character `line1` limit.
- Confirm `TERMINAL_API_BASE` matches the environment of `TERMINAL_API_KEY`.
- Confirm the API key is present and has access to live or sandbox quoting as appropriate.
- Confirm parcel weights resolved successfully in server logs, including fallback use where expected.
- Check the `[shipping] Terminal destination resolution` log: submitted vs resolved city/state, whether the city matched Terminal's list, and whether validation succeeded.
- A city that Terminal does not list (e.g. a spelling the plugin uses but Terminal doesn't) yields no rates by design — use pickup or delivery assistance, never a manual rate.
- Confirm the response was an empty Terminal rate list rather than a checkout validation error.

For operational log locations, see [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).

## Pickup summary

Pickup is a separate fulfillment method documented in [`PICKUP.md`](PICKUP.md). It never calls Terminal Africa, never requires a quote, stores `babysecret_pickup` shipping data, and resolves the configured location server-side by location ID.
