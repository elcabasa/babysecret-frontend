"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, CartItemInput } from "@/types/cart";

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItemInput) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void;
  incrementQuantity: (productId: string, variantId?: string) => void;
  decrementQuantity: (productId: string, variantId?: string) => void;
  clearCart: () => void;
};

const matches = (item: CartItem, productId: string, variantId?: string) =>
  item.productId === productId && item.variantId === variantId;

const variantKey = (variantId?: string) => variantId ?? "";

/**
 * Union-merges two carts by product/variation, keeping the higher quantity
 * per line. Used when a server cart arrives while the customer is shopping:
 * a blind replace would wipe items added after the request started (the
 * classic "first click does nothing, second click works"). Max-quantity is
 * idempotent — merging a cart with its own server echo never doubles counts —
 * while still preserving locally added lines and server-side lines.
 */
export function mergeCartItems(local: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged: CartItem[] = local.map((item) => ({ ...item }));

  for (const item of incoming) {
    const existing = merged.find(
      (entry) =>
        entry.productId === item.productId &&
        variantKey(entry.variantId) === variantKey(item.variantId),
    );

    if (!existing) {
      merged.push({ ...item });
    } else {
      existing.quantity = Math.max(existing.quantity, item.quantity);
    }
  }

  return merged;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  setItems: (items) => set({ items }),
  addItem: (input) =>
    set((state) => {
      const quantity = Number.isFinite(input.quantity)
        ? Math.max(1, Math.floor(input.quantity ?? 1))
        : 1;
      const existing = state.items.find((item) =>
        matches(item, input.productId, input.variantId),
      );
      if (!existing) return { items: [...state.items, { ...input, quantity }] };
      return {
        items: state.items.map((item) =>
          matches(item, input.productId, input.variantId)
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      };
    }),
  removeItem: (productId, variantId) =>
    set((state) => ({
      items: state.items.filter((item) => !matches(item, productId, variantId)),
    })),
  updateQuantity: (productId, quantity, variantId) =>
    set((state) => ({
      items: state.items.map((item) =>
        matches(item, productId, variantId)
          ? {
              ...item,
              quantity: Number.isFinite(quantity)
                ? Math.max(1, Math.floor(quantity))
                : 1,
            }
          : item,
      ),
    })),
  incrementQuantity: (productId, variantId) =>
    set((state) => ({
      items: state.items.map((item) =>
        matches(item, productId, variantId)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    })),
  decrementQuantity: (productId, variantId) =>
    set((state) => ({
      items: state.items.map((item) =>
        matches(item, productId, variantId)
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "babysecret-cart",
      storage: createJSONStorage(() => localStorage),
      // Persist lines only — never functions or hydration flags. Variant ids
      // ride along inside each line, so refresh/restart keeps variations.
      // Sign-in/sign-out reconciliation stays in UserDataSync (union-merge),
      // so hydration can never wipe a freshly added item.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export const selectTotalItems = (state: CartState) =>
  state.items.reduce((total, item) => total + item.quantity, 0);
export const selectSubtotal = (state: CartState) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);
