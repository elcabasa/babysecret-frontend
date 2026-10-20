# Shipping, Delivery, and Pickup

Baby Secret currently uses the following customer-facing delivery options. Terminal Africa, Shipbubble, and WooCommerce carrier integrations remain in the codebase for possible future use, but are not used to calculate customer delivery rates in the current checkout flow.

## Within Lagos

Customers can choose one of these options:

- **Pickup — free:** Flawless Plaza, at the back of IMO Plaza, International Trade Fair Complex, Lagos, Nigeria.
- **Instant Delivery:** Dispatch fees depend on the customer's delivery location. The fee is confirmed separately and paid directly to the dispatch rider; it is not included in the online WooCommerce order total.

Pickup is validated on the server and is only available for Lagos, Nigeria orders.

## Outside Lagos

- **Standard waybill fee: ₦4,000.**
- Orders above **₦100,000** may incur extra fees depending on the size or volume of the goods. This is disclosed during checkout and in the order note so the customer knows the standard fee may not cover unusually large orders.

The frontend's displayed selection is not trusted for pricing. `POST /api/checkout` validates the destination and derives the fixed ₦4,000 waybill charge or zero shipping-line amount for instant delivery on the server. Instant delivery's rider fee is paid separately and is not collected through checkout.

## Implementation

- `src/components/forms/delivery-methods.tsx` — customer-facing Waybill / Instant Delivery selection and fee notes.
- `src/components/forms/fulfillment-method-selector.tsx` — delivery versus Lagos pickup.
- `src/config/pickup.ts` — single source of truth for the free pickup location.
- `src/app/api/checkout/route.ts` — server-side method, location, and fee validation; writes the method and payment instructions into the WooCommerce order.
- `src/data/site.ts` — store contact phone number used across the site.
- `src/services/shipping/tship.service.ts` and `src/services/shipping/shipping.service.ts` — legacy provider implementation preserved but bypassed by the current customer checkout flow.

No Terminal Africa quotes are required for current waybill or instant-delivery checkout. The checkout uses the customer-entered city/town and street address rather than a Terminal-specific city list or postal-code requirement.
