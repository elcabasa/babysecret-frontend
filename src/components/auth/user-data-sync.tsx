"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import type { CartItem } from "@/types/cart";

function sameCart(a: CartItem[], b: CartItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function UserDataSync() {
  const { status, data: session } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const setCartItems = useCartStore((s) => s.setItems);
  const clearCart = useCartStore((s) => s.clearCart);

  const wishlistItems = useWishlistStore((s) => s.items);
  const wishlistHydrated = useWishlistStore((s) => s.hasHydrated);
  const setWishlistItems = useWishlistStore((s) => s.setItems);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  const activeUserId = useRef<string | null>(null);
  const isInitialLoadDone = useRef(false);

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;

    if (status === "authenticated" && currentUserId) {
      if (activeUserId.current !== currentUserId) {
        activeUserId.current = currentUserId;
        isInitialLoadDone.current = false;

        fetch("/api/account/cart")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            setCartItems(Array.isArray(data?.items) ? data.items : []);
          })
          .catch(() => {})
          .finally(() => {
            isInitialLoadDone.current = true;
          });

        fetch("/api/account/wishlist")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.items && Array.isArray(data.items)) {
              setWishlistItems(data.items);
            } else {
              setWishlistItems([]);
            }
          })
          .catch(() => {});
      }
    } else if (status === "unauthenticated") {
      if (activeUserId.current !== null) {
        activeUserId.current = null;
        isInitialLoadDone.current = false;
        clearCart();
        clearWishlist();
      }
    }
  }, [
    status,
    session?.user?.id,
    wishlistHydrated,
    setCartItems,
    setWishlistItems,
    clearCart,
    clearWishlist,
  ]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !activeUserId.current ||
      !isInitialLoadDone.current
    )
      return;

    const timer = setTimeout(() => {
      fetch("/api/account/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const verified = data?.items as CartItem[] | undefined;
          if (
            Array.isArray(verified) &&
            !sameCart(verified, useCartStore.getState().items)
          ) {
            setCartItems(verified);
          }
        })
        .catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [cartItems, status, setCartItems]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !activeUserId.current ||
      !isInitialLoadDone.current
    )
      return;

    const timer = setTimeout(() => {
      fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: wishlistItems }),
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [wishlistItems, status]);

  return null;
}
