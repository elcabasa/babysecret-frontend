"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/store/cart.store";

export function AddToCartButton({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState("");
  const unavailable =
    product.stockStatus === "out-of-stock" || product.purchasable === false;
  const handleAdd = () => {
    if (unavailable) return;
    try {
      addItem({
        productId: product.id,
        slug: product.slug ?? product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        stockStatus: product.stockStatus,
      });
      setAddError("");
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1600);
    } catch {
      // addItem is synchronous and cannot partially apply, so the cart is
      // untouched here — surface the failure instead of staying silent.
      setAddError("Could not add this item. Please try again.");
    }
  };
  if (unavailable && compact) {
    return (
      <div
        className="flex size-10 items-center justify-center rounded-full border border-red-200 bg-red-50 p-1 text-center font-medium text-red-600 select-none cursor-not-allowed"
        title="This product is currently out of stock"
        role="status"
        aria-label="Out of stock"
      >
        <span className="text-[10px] leading-tight font-bold tracking-tighter uppercase">
          Sold
          <br />
          Out
        </span>
      </div>
    );
  }

  return (
    <>
    <button
      type="button"
      onClick={handleAdd}
      disabled={unavailable}
      aria-label={
        unavailable
          ? `${product.name} is unavailable`
          : added
            ? `Added ${product.name} to cart`
            : `Add ${product.name} to cart`
      }
      className={
        compact
          ? "grid size-10 place-items-center rounded-full bg-[#3051a0] text-white transition hover:bg-[#005dbd] disabled:cursor-not-allowed disabled:bg-[#dbe7f3] disabled:text-[#334f6d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005dbd]"
          : "inline-flex items-center gap-2 rounded-full bg-[#005dbd] px-8 py-4 font-semibold text-white transition hover:bg-[#004d9c] disabled:cursor-not-allowed disabled:bg-[#dbe7f3] disabled:text-[#334f6d] disabled:hover:bg-[#dbe7f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005dbd]"
      }
    >
      {unavailable ? (
        "Out of stock"
      ) : added ? (
        <Check size={compact ? 18 : 20} />
      ) : (
        <ShoppingCart size={compact ? 18 : 20} />
      )}
      {!compact && !unavailable && (added ? "Added to cart" : "Add to cart")}
      {added && (
        <span className="sr-only" role="status">
          Added to cart
        </span>
      )}
    </button>
    {addError && (
      <span className="text-xs text-red-700" role="alert">
        {addError}
      </span>
    )}
    </>
  );
}
