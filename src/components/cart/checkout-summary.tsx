"use client";
import Link from "next/link";
import { useCartStore, selectSubtotal } from "@/store/cart.store";
import { useDeliveryStore, selectSelectedQuote } from "@/store/delivery.store";
import { formatPrice } from "@/data/products";
export function CheckoutSummary() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectSubtotal);
  const hydrated = useCartStore((state) => state.hasHydrated);
  const selectedQuote = useDeliveryStore(selectSelectedQuote);
  const deliveryStatus = useDeliveryStore((state) => state.status);

  if (!hydrated)
    return (
      <aside className="glass-panel rounded-2xl p-6 text-sm text-[#334f6d]">
        Loading order summary…
      </aside>
    );
  if (!items.length)
    return (
      <aside className="glass-panel rounded-2xl p-6">
        <p className="text-[#334f6d]">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-5 inline-block font-semibold text-[#005dbd]"
        >
          Continue shopping
        </Link>
      </aside>
    );

  const deliveryAmount = selectedQuote?.amount ?? null;
  const total = subtotal + (deliveryAmount ?? 0);

  return (
    <aside className="glass-panel rounded-2xl p-6">
      <h2 className="font-semibold">Order summary</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "default"}`}
            className="flex justify-between gap-4 text-sm"
          >
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3 border-t border-[#e5e3e3] pt-5 text-sm">
        <div className="flex justify-between">
          <span className="text-[#334f6d]">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {selectedQuote && deliveryAmount !== null ? (
          <div className="flex justify-between">
            <span className="text-[#334f6d]">
              {selectedQuote.carrierName} · {selectedQuote.service}
            </span>
            <span className="font-semibold">{formatPrice(deliveryAmount)}</span>
          </div>
        ) : deliveryStatus === "loading" ? (
          <div className="flex justify-between">
            <span className="text-[#334f6d]">Delivery</span>
            <span className="text-[#334f6d]">Calculating…</span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-[#334f6d]">Delivery</span>
            <span className="text-[#334f6d]">Select a method</span>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-between border-t border-[#e5e3e3] pt-5 text-lg">
        <strong>Total</strong>
        <strong>{formatPrice(total)}</strong>
      </div>
    </aside>
  );
}
