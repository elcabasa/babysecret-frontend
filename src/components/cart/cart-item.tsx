"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/types/cart";
import { useCartStore } from "@/store/cart.store";
import { formatPrice } from "@/data/products";

export function CartItem({ item }: { item: CartItemType }) {
  const { incrementQuantity, decrementQuantity, removeItem } = useCartStore();
  return <article className="flex gap-4 border-b border-[#e5e3e3] py-5"><div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#edf7f8]"><Image src={item.image} alt={item.name} fill className="object-cover" unoptimized /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="truncate font-medium">{item.name}</h2><p className="mt-1 text-sm text-[#334f6d]">{formatPrice(item.price)}</p></div><button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="text-[#7c7979] hover:text-red-600" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></div><div className="mt-4 flex items-center gap-3"><div className="flex items-center rounded-full border border-[#e5e3e3]"><button type="button" onClick={() => decrementQuantity(item.productId, item.variantId)} className="grid size-8 place-items-center" aria-label={`Decrease ${item.name} quantity`}><Minus size={14} /></button><span className="w-8 text-center text-sm">{item.quantity}</span><button type="button" onClick={() => incrementQuantity(item.productId, item.variantId)} className="grid size-8 place-items-center" aria-label={`Increase ${item.name} quantity`}><Plus size={14} /></button></div><span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span></div></div></article>;
}
