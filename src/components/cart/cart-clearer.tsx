"use client";

import { useEffect } from "react";

import { useCartStore } from "@/store/cart.store";

export function CartClearer() {
  useEffect(() => {
    useCartStore.getState().clearCart();
  }, []);

  return null;
}
