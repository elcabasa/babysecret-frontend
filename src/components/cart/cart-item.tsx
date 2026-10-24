"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/types/cart";
import { useCartStore } from "@/store/cart.store";
import { formatPrice } from "@/data/products";

export function CartItem({ item }: { item: CartItemType }) {
  const { incrementQuantity, decrementQuantity, removeItem } = useCartStore();
  const outOfStock = item.stockStatus === "out-of-stock";

  return (
    <article className="flex gap-4 border-b border-[#e5e3e3] py-5">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#edf7f8]">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className={`object-cover ${outOfStock ? "opacity-60 grayscale" : ""}`}
          unoptimized
        />
        {outOfStock && (
          <span className="absolute left-1/2 top-1/2 w-max -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={`truncate ${outOfStock ? "font-medium text-[#5a6b7e]" : "font-medium"}`}
            >
              {item.name}
            </h2>
            <p
              className={`mt-1 text-sm ${outOfStock ? "text-[#5a6b7e]" : "text-[#334f6d]"}`}
            >
              {formatPrice(item.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.productId, item.variantId)}
            className="rounded-full p-1 text-[#5f5b5b] transition hover:bg-[#fbecec] hover:text-red-700 focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-1"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {outOfStock ? (
            <p className="text-xs font-medium text-red-700">
              Not available for delivery
            </p>
          ) : (
            <div className="flex items-center rounded-full border border-[#64748b] bg-white">
              <button
                type="button"
                onClick={() =>
                  decrementQuantity(item.productId, item.variantId)
                }
                className="grid size-8 place-items-center rounded-full transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Decrease ${item.name} quantity`}
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                type="button"
                onClick={() =>
                  incrementQuantity(item.productId, item.variantId)
                }
                className="grid size-8 place-items-center rounded-full transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Increase ${item.name} quantity`}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
          <span
            className={`text-sm font-semibold ${outOfStock ? "text-[#5a6b7e]" : ""}`}
          >
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </article>
  );
}
