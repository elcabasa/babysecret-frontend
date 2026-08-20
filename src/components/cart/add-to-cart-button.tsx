"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/store/cart.store";

export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    addItem({ productId: product.id, slug: product.id, name: product.name, image: product.image, price: product.price });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };
  return <button type="button" onClick={handleAdd} aria-label={`Add ${product.name} to cart`} className={compact ? "grid size-10 place-items-center rounded-full bg-[#3051a0] text-white transition hover:bg-[#005dbd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005dbd]" : "inline-flex items-center gap-2 rounded-full bg-[#005dbd] px-8 py-4 font-semibold text-white transition hover:bg-[#004d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005dbd]"}>{added ? <Check size={compact ? 18 : 20} /> : <ShoppingCart size={compact ? 18 : 20} />}{!compact && (added ? "Added to cart" : "Add to cart")}</button>;
}
