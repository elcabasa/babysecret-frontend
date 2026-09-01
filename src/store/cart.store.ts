"use client";

import { create } from "zustand";
import type { CartItem, CartItemInput } from "@/types/cart";

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItemInput) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  incrementQuantity: (productId: string, variantId?: string) => void;
  decrementQuantity: (productId: string, variantId?: string) => void;
  clearCart: () => void;
};

const matches = (item: CartItem, productId: string, variantId?: string) => item.productId === productId && item.variantId === variantId;

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  hasHydrated: true,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  setItems: (items) => set({ items }),
  addItem: (input) => set((state) => {
    const quantity = Number.isFinite(input.quantity) ? Math.max(1, Math.floor(input.quantity ?? 1)) : 1;
    const existing = state.items.find((item) => matches(item, input.productId, input.variantId));
    if (!existing) return { items: [...state.items, { ...input, quantity }] };
    return { items: state.items.map((item) => matches(item, input.productId, input.variantId) ? { ...item, quantity: item.quantity + quantity } : item) };
  }),
  removeItem: (productId, variantId) => set((state) => ({ items: state.items.filter((item) => !matches(item, productId, variantId)) })),
  updateQuantity: (productId, quantity, variantId) => set((state) => ({ items: state.items.map((item) => matches(item, productId, variantId) ? { ...item, quantity: Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1 } : item) })),
  incrementQuantity: (productId, variantId) => set((state) => ({ items: state.items.map((item) => matches(item, productId, variantId) ? { ...item, quantity: item.quantity + 1 } : item) })),
  decrementQuantity: (productId, variantId) => set((state) => ({ items: state.items.map((item) => matches(item, productId, variantId) ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item) })),
  clearCart: () => set({ items: [] }),
}));

export const selectTotalItems = (state: CartState) => state.items.reduce((total, item) => total + item.quantity, 0);
export const selectSubtotal = (state: CartState) => state.items.reduce((total, item) => total + item.price * item.quantity, 0);