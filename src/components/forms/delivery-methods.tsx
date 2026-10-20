"use client";

import { useEffect } from "react";
import { useDeliveryStore } from "@/store/delivery.store";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import { formatPrice } from "@/data/products";
import type { DeliveryQuote } from "@/types/shipping";

const WAYBILL_FEE = 4000;

export function DeliveryMethods({ state, subtotal }: { state: string; subtotal: number }) {
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
          service: "Dispatch fee is paid directly to the dispatch rider",
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
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">Delivery method</h3>
      {!state.trim() ? (
        <p className="mt-2 text-sm text-[#334f6d]">Select your state to see the available delivery method.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {quotes.map((quote) => (
            <label key={quote.rateId} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#005dbd] bg-[#e7effc] px-4 py-3 text-sm">
              <span className="flex items-center gap-3">
                <input type="radio" name="delivery" checked={selectedRateId === quote.rateId} onChange={() => selectRate(quote.rateId)} className="size-4 shrink-0 accent-[#005dbd]" />
                <span>
                  <span className="block font-semibold">{quote.carrierName}</span>
                  <span className="block text-[#334f6d]">{quote.service}</span>
                </span>
              </span>
              <strong>{quote.rateId === "babysecret_instant" ? "Paid to rider" : formatPrice(quote.amount)}</strong>
            </label>
          ))}
        </div>
      )}
      {isLagos ? (
        <p className="mt-3 rounded-lg bg-[#e7effc] p-3 text-sm text-[#334f6d]">
          Instant delivery is available within Lagos. The dispatch fee depends on your location and will be confirmed separately. Pay the dispatch rider directly; this fee is not included in your online order total.
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-[#e7effc] p-3 text-sm text-[#334f6d]">
          Standard waybill delivery outside Lagos costs ₦4,000. {subtotal > 100000 ? "Your order is above ₦100,000, so additional fees may apply due to the size or volume of the goods." : "Orders above ₦100,000 may incur additional fees due to the size or volume of the goods."}
        </p>
      )}
    </div>
  );
}
