"use client";

import { useEffect } from "react";
import { MapPin, PackageCheck, Truck, Zap } from "lucide-react";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import type { FulfillmentMethod } from "@/types/order";

export function FulfillmentMethodSelector({ state }: { state: string }) {
  const method = useFulfillmentStore((store) => store.method);
  const setMethod = useFulfillmentStore((store) => store.setMethod);
  const isLagos = state.trim().toLowerCase() === "lagos";

  useEffect(() => {
    if (!isLagos && method === "pickup") setMethod("delivery");
  }, [isLagos, method, setMethod]);

  const options: {
    id: FulfillmentMethod;
    label: string;
    hint: string;
    detail: string;
    icon: "truck" | "pickup";
  }[] = [
    {
      id: "delivery",
      label: isLagos ? "Instant delivery" : "Waybill delivery",
      hint: isLagos
        ? "Delivered to your address by a local dispatch rider"
        : "Delivery to other states",
      detail: isLagos ? "Dispatch fee paid directly to the rider" : "₦4,000 standard waybill fee",
      icon: "truck",
    },
    ...(isLagos
      ? [
          {
            id: "pickup" as const,
            label: "Free pickup",
            hint: "Collect your order at our Trade Fair Complex pickup point",
            detail: "₦0 pickup fee",
            icon: "pickup" as const,
          },
        ]
      : []),
  ];

  return (
    <section className="sm:col-span-2" aria-labelledby="fulfillment-heading">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7effc] text-[#005dbd]">
          {isLagos ? <MapPin className="size-5" /> : <Truck className="size-5" />}
        </span>
        <div>
          <h3 id="fulfillment-heading" className="text-base font-semibold text-slate-900">
            {isLagos ? "How would you like to receive your order?" : "Delivery method"}
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isLagos
              ? "For Lagos orders, choose free pickup or instant delivery."
              : "Waybill delivery is available outside Lagos."}
          </p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${isLagos ? "sm:grid-cols-2" : "sm:grid-cols-1"}`} role="radiogroup" aria-label="How to receive your order">
        {options.map((option) => {
          const selected = method === option.id;

          return (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition sm:p-5 ${
                selected
                  ? "border-[#005dbd] bg-[#f3f7ff] ring-2 ring-[#005dbd]/15"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="fulfillmentMethod"
                value={option.id}
                checked={selected}
                onChange={() => setMethod(option.id)}
                className="mt-1 size-4 shrink-0 accent-[#005dbd]"
              />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#005dbd] shadow-sm ring-1 ring-slate-200">
                {option.icon === "pickup" ? <PackageCheck className="size-5" /> : isLagos ? <Zap className="size-5" /> : <Truck className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{option.label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{option.hint}</span>
                <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${option.id === "pickup" ? "bg-emerald-50 text-emerald-700" : isLagos ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                  {option.detail}
                </span>
                {option.id === "pickup" ? (
                  <span className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    Flawless Plaza, behind IMO Plaza, International Trade Fair Complex, Lagos.
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
