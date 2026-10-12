/**
 * Baby Secret pickup configuration — the single source of truth for
 * customer-collect orders.
 *
 * Why this file exists
 * --------------------
 * Pickup data is business configuration, not view logic, so it lives here
 * instead of inside React components (requirement: no hardcoded pickup data
 * in components). Both the client (via `/api/pickup-locations`) and the server
 * (`/api/checkout`) read from here, so a pickup fee can never be tampered with
 * by editing a request payload — the server re-resolves the location by id and
 * trusts only the configured `fee`.
 *
 * Pickup is intentionally kept separate from the *shipping origin* configured
 * through `SHIPPING_PICKUP_*` env vars (see tship.service.ts). Those describe
 * where parcels are handed to Terminal Africa for delivery; this file describes
 * where a customer can physically collect an order.
 */

export type PickupLocationId = string;

export interface PickupLocation {
  /** Stable identifier persisted on the WooCommerce order. */
  id: PickupLocationId;
  /** Customer-facing name, e.g. "Flawless Plaza". */
  name: string;
  /** Street address. */
  address: string;
  city: string;
  state: string;
  country: string;
  /**
   * Pickup fee in the store currency. Defaults to `DEFAULT_PICKUP_FEE`
   * (0) when omitted on a location.
   */
  fee: number;
  /** Optional human-readable opening hours, shown to the customer. */
  openingHours?: string;
  /** Optional contact number for the pickup point. */
  phone?: string;
  /** Optional latitude/longitude for future map links. */
  latitude?: number;
  longitude?: number;
}

/**
 * Default pickup fee. Pickup is free unless a location explicitly overrides it.
 */
export const DEFAULT_PICKUP_FEE = 0;

/**
 * Pickup points currently offered to customers.
 *
 * To add a location, append an entry here — no component changes are needed.
 * `fee` is read from `DEFAULT_PICKUP_FEE` when you leave it out.
 */
export const PICKUP_LOCATIONS: readonly PickupLocation[] = [
  {
    id: "flawless-plaza",
    name: "Flawless Plaza",
    address: "At the back of IMO Plaza, International Trade Fair Complex",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    fee: DEFAULT_PICKUP_FEE,
  },
];

/**
 * All configured pickup locations.
 */
export function getPickupLocations(): readonly PickupLocation[] {
  return PICKUP_LOCATIONS.filter((location) => Boolean(location.id));
}

/**
 * Looks up a pickup location by id. Returns `null` for unknown ids so callers
 * can reject the request rather than silently charging the wrong fee.
 */
export function getPickupLocation(
  id: PickupLocationId | null | undefined,
): PickupLocation | null {
  if (!id) return null;

  return (
    getPickupLocations().find(
      (location) => location.id === String(id).trim().toLowerCase(),
    ) ?? null
  );
}

/**
 * Resolves the fee for a pickup location, trusting only server configuration.
 */
export function getPickupFee(id: PickupLocationId | null | undefined): number {
  const location = getPickupLocation(id);

  if (!location) return DEFAULT_PICKUP_FEE;

  return Number.isFinite(location.fee) ? location.fee : DEFAULT_PICKUP_FEE;
}

/**
 * Single-line address used in the UI, order meta and transactional emails.
 */
export function formatPickupAddress(
  location: PickupLocation,
): string {
  return [location.address, location.city, location.state, location.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * Compact shape safe to send to the browser: omits nothing sensitive (all
 * fields are public store information) but keeps the payload explicit.
 */
export interface PickupLocationSummary {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  fee: number;
  openingHours?: string;
  fullAddress: string;
}

export function toPickupLocationSummaries(): PickupLocationSummary[] {
  return getPickupLocations().map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    city: location.city,
    state: location.state,
    fee: Number.isFinite(location.fee) ? location.fee : DEFAULT_PICKUP_FEE,
    ...(location.openingHours ? { openingHours: location.openingHours } : {}),
    fullAddress: formatPickupAddress(location),
  }));
}