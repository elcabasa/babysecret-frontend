"use client";

import { create } from "zustand";
import type { FulfillmentMethod } from "@/types/order";
import type { PickupLocationSummary } from "@/config/pickup";

/**
 * Fulfillment selection for checkout.
 *
 * Kept separate from `delivery.store` because delivery and pickup are mutually
 * exclusive flows: delivery quotes live in `delivery.store` (and are never
 * requested for pickup orders), while pickup locations and their configured
 * fee live here.
 */
type FulfillmentState = {
  method: FulfillmentMethod;
  pickupLocationId: string | null;
  pickupLocations: PickupLocationSummary[];
  setMethod: (method: FulfillmentMethod) => void;
  selectPickupLocation: (locationId: string | null) => void;
  setPickupLocations: (locations: PickupLocationSummary[]) => void;
  reset: () => void;
};

export const useFulfillmentStore = create<FulfillmentState>()((set) => ({
  method: "delivery",
  pickupLocationId: null,
  pickupLocations: [],
  setMethod: (method) =>
    set((state) => ({
      method,
      // Switching to delivery must never carry a stale pickup selection, and
      // vice versa, so the two flows cannot bleed into each other.
      pickupLocationId: method === "pickup" ? state.pickupLocationId : null,
    })),
  selectPickupLocation: (pickupLocationId) => set({ pickupLocationId }),
  setPickupLocations: (pickupLocations) =>
    set((state) => ({
      pickupLocations,
      // Drop a selection that is no longer offered.
      pickupLocationId: pickupLocations.some(
        (location) => location.id === state.pickupLocationId,
      )
        ? state.pickupLocationId
        : null,
    })),
  reset: () =>
    set({
      method: "delivery",
      pickupLocationId: null,
      pickupLocations: [],
    }),
}));

export const selectPickupLocation = (
  state: FulfillmentState,
): PickupLocationSummary | null =>
  state.pickupLocations.find(
    (location) => location.id === state.pickupLocationId,
  ) ?? null;

/**
 * Fee charged for the selected pickup location. Read from the server-provided
 * location list so the figure always matches what `/api/checkout` will apply.
 */
export const selectPickupFee = (state: FulfillmentState): number =>
  selectPickupLocation(state)?.fee ?? 0;