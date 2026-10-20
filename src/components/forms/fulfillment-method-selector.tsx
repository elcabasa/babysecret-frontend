"use client";

import { useEffect } from "react";
import { PackageCheck, Truck } from "lucide-react";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import type { FulfillmentMethod } from "@/types/order";

const OPTIONS: { id: FulfillmentMethod; label: string; hint: string; icon: "truck" | "pickup" }[] = [
  { id: "delivery", label: "Delivery", hint: "Waybill outside Lagos or instant dispatch within Lagos", icon: "truck" },
  { id: "pickup", label: "Pickup", hint: "Free collection from Flawless Plaza, Trade Fair Complex, Lagos", icon: "pickup" },
];

export function FulfillmentMethodSelector({ state }: { state: string }) {
  const method = useFulfillmentStore((store) => store.method);
  const setMethod = useFulfillmentStore((store) => store.setMethod);
  const isLagos = state.trim().toLowerCase() === "lagos";
  const options = OPTIONS.filter((option) => option.id !== "pickup" || isLagos);

  useEffect(() => {
    if (!isLagos && method === "pickup") setMethod("delivery");
  }, [isLagos, method, setMethod]);

  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">Fulfillment method</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Fulfillment method">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#64748b] bg-white px-4 py-3 text-sm">
            <input type="radio" name="fulfillmentMethod" value={option.id} checked={method === option.id} onChange={() => setMethod(option.id)} className="size-4 shrink-0 accent-[#005dbd]" />
            <span className="flex items-center gap-3">
              {option.icon === "truck" ? <Truck className="size-4 shrink-0 text-[#005dbd]" /> : <PackageCheck className="size-4 shrink-0 text-[#005dbd]" />}
              <span className="flex flex-col">
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-[11px] text-[#334f6d]">{option.hint}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
