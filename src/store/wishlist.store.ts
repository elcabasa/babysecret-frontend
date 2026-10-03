"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/types/product";

type WishlistState = {
  items: Product[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setItems: (items: Product[]) => void;
  toggleItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setItems: (items) => set({ items }),
      toggleItem: (product) =>
        set((state) =>
          state.items.some((item) => item.id === product.id)
            ? { items: state.items.filter((item) => item.id !== product.id) }
            : { items: [...state.items, product] },
        ),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "babysecret-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export const selectWishlistCount = (state: WishlistState) => state.items.length;
