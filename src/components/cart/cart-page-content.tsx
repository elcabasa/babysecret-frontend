"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCartStore, selectSubtotal } from "@/store/cart.store";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";

export function CartPageContent() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectSubtotal);
  const hydrated = useCartStore((state) => state.hasHydrated);
  const clearCart = useCartStore((state) => state.clearCart);

  if (!hydrated) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-[#334f6d]">
        Loading your cart…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center">
        <ShoppingCart className="mx-auto text-[#3051a0]" size={36} />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-[#334f6d]">
          Add something lovely for your little one to get started.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="glass-panel rounded-2xl px-6">
        <div className="flex items-center justify-between border-b border-[#e5e3e3] py-5">
          <h2 className="font-semibold">Your items</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#334f6d]">
              {items.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove all items from your cart?")) {
                  clearCart();
                }
              }}
              className="text-sm font-medium text-[#c0392b] hover:underline"
            >
              Clear cart
            </button>
          </div>
        </div>
        {items.map((item) => (
          <CartItem
            key={`${item.productId}-${item.variantId ?? "default"}`}
            item={item}
          />
        ))}
      </div>
      <CartSummary subtotal={subtotal} />
    </div>
  );
}
