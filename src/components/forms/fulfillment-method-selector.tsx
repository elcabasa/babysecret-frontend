"use client";

import { PackageCheck, Truck } from "lucide-react";

import { useFulfillmentStore } from "@/store/fulfillment.store";
import type { FulfillmentMethod } from "@/types/order";

const OPTIONS: {
  id: FulfillmentMethod;
  label: string;
  hint: string;
  icon: "truck" | "pickup";
}[] = [
  {
    id: "delivery",
    label: "Delivery",
    hint: "Shipped to your address",
    icon: "truck",
  },
  {
    id: "pickup",
    label: "Pickup",
    hint: "Collect from a Baby Secret store",
    icon: "pickup",
  },
];

/**
 * Fulfillment method selector.
 *
 * Delivery keeps its existing behaviour (Terminal Africa quotes, a quote is
 * required). Pickup never contacts Terminal Africa and instead asks for a
 * location via `<PickupLocations />`.
 */
export function FulfillmentMethodSelector() {
  const method = useFulfillmentStore((state) => state.method);
  const setMethod = useFulfillmentStore((state) => state.setMethod);

  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">Fulfillment method</h3>

      <div
        className="mt-3 grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Fulfillment method"
      >
        {OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition hover:border-[#005dbd] focus-within:ring-2 focus-within:ring-[#005dbd] focus-within:ring-offset-1 ${
              method === option.id
                ? "border-[#005dbd] bg-[#e7effc] ring-1 ring-[#005dbd]"
                : "border-[#64748b] bg-white"
            }`}
          >
            <input
              type="radio"
              name="fulfillmentMethod"
              value={option.id}
              checked={method === option.id}
              onChange={() => setMethod(option.id)}
              className="size-4 shrink-0 accent-[#005dbd]"
            />
            <span className="flex items-center gap-3">
              {option.icon === "truck" ? (
                <Truck className="size-4 shrink-0 text-[#005dbd]" />
              ) : (
                <PackageCheck className="size-4 shrink-0 text-[#005dbd]" />
              )}
              <span className="flex flex-col">
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-[11px] text-[#334f6d]">
                  {option.hint}
                </span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}