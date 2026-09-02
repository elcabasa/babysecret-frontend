"use client";

import { useDeliveryStore } from "@/store/delivery.store";
import { formatPrice } from "@/data/products";

export function DeliveryMethods() {
  const quotes = useDeliveryStore((state) => state.quotes);
  const selectedRateId = useDeliveryStore((state) => state.selectedRateId);
  const status = useDeliveryStore((state) => state.status);
  const deliveryError = useDeliveryStore((state) => state.error);
  const selectRate = useDeliveryStore((state) => state.selectRate);

  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">Delivery method</h3>

      {status === "loading" && (
        <p className="mt-2 text-sm text-[#334f6d]">
          Estimating delivery rates for your address…
        </p>
      )}

      {status === "unavailable" && (
        <p className="mt-2 text-sm text-red-700">
          No delivery rate is available for this address.
        </p>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {deliveryError ||
            "Could not estimate delivery. Please review your address."}
        </p>
      )}

      {status === "ready" && quotes.length > 0 && (
        <div className="mt-3 grid gap-3">
          {quotes.map((quote) => (
            <label
              key={quote.rateId}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
                selectedRateId === quote.rateId
                  ? "border-[#005dbd] bg-[#e7effc]"
                  : "border-[#e5e3e3] bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="delivery"
                  checked={selectedRateId === quote.rateId}
                  onChange={() => selectRate(quote.rateId)}
                />
                <span>
                  <span className="block font-semibold">
                    {quote.carrierName}
                  </span>
                  <span className="block text-[#334f6d]">
                    {quote.service}
                    {quote.deliveryTime ? ` · ${quote.deliveryTime}` : ""}
                  </span>
                </span>
              </span>
              <strong>{formatPrice(quote.amount)}</strong>
            </label>
          ))}
        </div>
      )}

      {status === "idle" && (
        <p className="mt-2 text-sm text-[#334f6d]">
          Delivery is calculated from your address and cart contents.
        </p>
      )}
    </div>
  );
}