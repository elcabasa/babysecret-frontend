"use client";

import { Clock, MapPin } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { selectPickupLocation, useFulfillmentStore } from "@/store/fulfillment.store";

/**
 * Pickup location picker.
 *
 * Locations come from `/api/pickup-locations` (which reads
 * `src/config/pickup.ts`) — no pickup data is hardcoded here. A location must
 * be selected before checkout can continue.
 */
export function PickupLocations() {
  const locations = useFulfillmentStore((state) => state.pickupLocations);
  const selectedId = useFulfillmentStore((state) => state.pickupLocationId);
  const selectLocation = useFulfillmentStore(
    (state) => state.selectPickupLocation,
  );
  const selected = useFulfillmentStore(selectPickupLocation);

  if (!locations.length) {
    return (
      <p className="mt-2 text-sm text-[#334f6d]">
        Loading pickup locations…
      </p>
    );
  }

  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">
        Choose a pickup location
        <span aria-hidden="true" className="text-red-700">
          {" "}
          *
        </span>
      </h3>

      <div
        className="mt-3 grid gap-3"
        role="radiogroup"
        aria-label="Pickup location"
      >
        {locations.map((location) => (
          <label
            key={location.id}
            className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition hover:border-[#005dbd] focus-within:ring-2 focus-within:ring-[#005dbd] focus-within:ring-offset-1 ${
              selectedId === location.id
                ? "border-[#005dbd] bg-[#e7effc] ring-1 ring-[#005dbd]"
                : "border-[#64748b] bg-white"
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="pickupLocation"
                value={location.id}
                checked={selectedId === location.id}
                onChange={() => selectLocation(location.id)}
                className="mt-1 size-4 shrink-0 accent-[#005dbd]"
              />
              <span className="flex flex-col gap-1">
                <span className="block font-semibold">{location.name}</span>
                <span className="flex items-start gap-1 text-[#334f6d]">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span className="block">{location.fullAddress}</span>
                </span>
                {location.openingHours ? (
                  <span className="flex items-start gap-1 text-[#334f6d]">
                    <Clock className="mt-0.5 size-3.5 shrink-0" />
                    <span className="block">{location.openingHours}</span>
                  </span>
                ) : null}
              </span>
            </span>
            <strong className="shrink-0">
              {location.fee > 0 ? formatPrice(location.fee) : "Pickup: Free"}
            </strong>
          </label>
        ))}
      </div>

      {!selected ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          Please select a pickup location to continue.
        </p>
      ) : (
        <p className="mt-3 rounded-xl bg-[#e7effc] px-4 py-3 text-xs leading-relaxed text-[#334f6d]">
          You&apos;ll collect your order from{" "}
          <strong className="font-semibold">{selected.name}</strong>. We&apos;ll
          email you as soon as it is ready.
        </p>
      )}
    </div>
  );
}