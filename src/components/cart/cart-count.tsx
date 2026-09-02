"use client";

import { useCartStore, selectTotalItems } from "@/store/cart.store";

export function CartCount() {
  const totalItems = useCartStore(selectTotalItems);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  if (!hasHydrated || totalItems === 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#005dbd] px-1 text-[10px] font-bold text-white"
      aria-label={`${totalItems} items in cart`}
    >
      {totalItems > 99 ? "99+" : totalItems}
    </span>
  );
}
