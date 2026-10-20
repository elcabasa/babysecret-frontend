"use client";

import { useEffect } from "react";
import { Info, MapPin, Package, Truck, Zap } from "lucide-react";
import { useDeliveryStore } from "@/store/delivery.store";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import { formatPrice } from "@/data/products";
import type { DeliveryQuote } from "@/types/shipping";

const WAYBILL_FEE = 4000;

export function DeliveryMethods({
  state,
  subtotal,
}: {
  state: string;
  subtotal: number;
}) {
  const method = useFulfillmentStore((store) => store.method);
  const quotes = useDeliveryStore((store) => store.quotes);
  const selectedRateId = useDeliveryStore((store) => store.selectedRateId);
  const selectRate = useDeliveryStore((store) => store.selectRate);
  const setQuotes = useDeliveryStore((store) => store.setQuotes);
  const reset = useDeliveryStore((store) => store.reset);
  const isLagos = state.trim().toLowerCase() === "lagos";

  useEffect(() => {
    if (method !== "delivery" || !state.trim()) {
      reset();
      return;
    }

    const quote: DeliveryQuote = isLagos
      ? {
          rateId: "babysecret_instant",
          carrierName: "Instant Delivery",
          carrierSlug: "babysecret-instant",
          service: "Dispatch fee is confirmed based on your delivery location and paid directly to the rider.",
          amount: 0,
          currency: "NGN",
        }
      : {
          rateId: "babysecret_waybill",
          carrierName: "Waybill Delivery",
          carrierSlug: "babysecret-waybill",
          service: "Standard waybill shipping; large orders may cost extra",
          amount: WAYBILL_FEE,
          currency: "NGN",
        };

    setQuotes([quote]);
  }, [method, state, isLagos, setQuotes, reset]);

  if (method !== "delivery") return null;

  return (
    <section className="sm:col-span-2" aria-labelledby="delivery-method-heading">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7effc] text-[#005dbd]">
          {isLagos ? <Zap className="size-5" /> : <Truck className="size-5" />}
        </span>
        <div>
          <h3 id="delivery-method-heading" className="text-base font-semibold text-slate-900">
            {isLagos ? "Delivery within Lagos" : "Delivery outside Lagos"}
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isLagos
              ? "Get your order delivered by a local dispatch rider."
              : "Your order will be sent to you by waybill."}
          </p>
        </div>
      </div>

      {!state.trim() ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0" />
          Select your state above to see the available delivery option.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {quotes.map((quote) => {
            const selected = selectedRateId === quote.rateId;
            const instant = quote.rateId === "babysecret_instant";

            return (
              <label
                key={quote.rateId}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition sm:p-5 ${
                  selected
                    ? "border-[#005dbd] bg-[#f3f7ff] ring-2 ring-[#005dbd]/15"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  value={quote.rateId}
                  checked={selected}
                  onChange={() => selectRate(quote.rateId)}
                  className="mt-1 size-4 shrink-0 accent-[#005dbd]"
                  aria-label={quote.carrierName}
                />
                <span className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#005dbd] shadow-sm ring-1 ring-slate-200">
                    {instant ? <Zap className="size-5" /> : <Package className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{quote.carrierName}</span>
                      {instant ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Lagos only
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">
                      {instant
                        ? "Fast local delivery to your address."
                        : "Delivered to your address outside Lagos."}
                    </span>
                    <span className="mt-2 block text-sm font-medium text-slate-800">
                      {instant ? "Dispatch fee paid separately" : formatPrice(quote.amount)}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {isLagos ? (
        <div className="mt-3 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="text-sm leading-5 text-amber-950">
            <p className="font-semibold">Dispatch fee is not included in your order total</p>
            <p className="mt-1">
              The fee depends on the dispatch rider&apos;s cost for your delivery location. We&apos;ll confirm the amount with you, and you pay the dispatch rider directly.
            </p>
          </div>
        </div>
      ) : state.trim() ? (
        <div className="mt-3 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-slate-500" />
          <p className="text-sm leading-5 text-slate-600">
            Waybill delivery costs {formatPrice(WAYBILL_FEE)}. Orders above ₦100,000 may incur additional charges depending on the parcel&apos;s size or volume.
            {subtotal > 100000 ? " Your current order is above ₦100,000, so an additional charge may apply." : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
