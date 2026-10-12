"use client";

import { useDeliveryStore } from "@/store/delivery.store";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import { formatPrice } from "@/data/products";

/**
 * Terminal Africa delivery rate picker.
 *
 * Rendered only for `delivery` orders — pickup orders never request quotes.
 * When no rate can be offered the customer is offered a switch to pickup or a
 * delivery-assistance request rather than being left blocked. Provider errors
 * are never shown: both the empty and error states render the same friendly
 * message.
 */
export function DeliveryMethods({
  onRequestAssistance,
}: {
  onRequestAssistance?: () => void;
}) {
  const method = useFulfillmentStore((state) => state.method);
  const setMethod = useFulfillmentStore((state) => state.setMethod);

  const quotes = useDeliveryStore((state) => state.quotes);
  const selectedRateId = useDeliveryStore((state) => state.selectedRateId);
  const status = useDeliveryStore((state) => state.status);
  const selectRate = useDeliveryStore((state) => state.selectRate);

  if (method !== "delivery") return null;

  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">
        Delivery method
        <span aria-hidden="true" className="text-red-700">
          {" "}
          *
        </span>
      </h3>

      {status === "loading" && (
        <p className="mt-2 text-sm text-[#334f6d]">
          Estimating delivery rates for your address…
        </p>
      )}

      {(status === "unavailable" || status === "error") && (
        <div className="mt-2 rounded-xl border border-[#f3c9c9] bg-[#fdf0f0] px-4 py-4">
          <p className="text-sm font-semibold text-red-700">
            Delivery unavailable
          </p>
          <p className="mt-1 text-sm text-red-700" role="alert">
            We couldn&apos;t find an automatic delivery option for this
            address.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setMethod("pickup")}
              className="rounded-full bg-[#005dbd] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004a97] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2 active:bg-[#004a97] disabled:cursor-not-allowed disabled:bg-[#dbe7f3] disabled:text-[#334f6d]"
            >
              Switch to Pickup
            </button>
            <p className="text-center text-xs font-medium text-[#334f6d]">
              Can&apos;t pick up?
            </p>
            <button
              type="button"
              onClick={onRequestAssistance}
              className="rounded-full border-2 border-[#005dbd] bg-white px-4 py-2.5 text-sm font-semibold text-[#005dbd] transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2 active:bg-[#d3e3f8] disabled:cursor-not-allowed disabled:border-[#9db9d6] disabled:bg-[#f4f8fc] disabled:text-[#5a6b7e]"
            >
              Request Delivery Assistance
            </button>
          </div>
          <p className="mt-3 text-xs text-[#334f6d]">
            Or adjust your address above and we&apos;ll try again.
          </p>
        </div>
      )}

      {status === "ready" && quotes.length > 0 && (
        <div className="mt-3 grid gap-3">
          {quotes.map((quote) => (
            <label
              key={quote.rateId}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition hover:border-[#005dbd] focus-within:ring-2 focus-within:ring-[#005dbd] focus-within:ring-offset-1 ${
                selectedRateId === quote.rateId
                  ? "border-[#005dbd] bg-[#e7effc] ring-1 ring-[#005dbd]"
                  : "border-[#64748b] bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="delivery"
                  checked={selectedRateId === quote.rateId}
                  onChange={() => selectRate(quote.rateId)}
                  className="size-4 shrink-0 accent-[#005dbd]"
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