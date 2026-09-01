"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

export function UserDataSync() {
  const { status, data: session } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const cartHydrated = useCartStore((s) => s.hasHydrated);
  const setCartItems = useCartStore((s) => s.setItems);
  const clearCart = useCartStore((s) => s.clearCart);

  const wishlistItems = useWishlistStore((s) => s.items);
  const wishlistHydrated = useWishlistStore((s) => s.hasHydrated);
  const setWishlistItems = useWishlistStore((s) => s.setItems);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  const activeUserId = useRef<string | null>(null);
  const isInitialLoadDone = useRef(false);

  // Handle Account Switch / Login / Logout
  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;

    if (status === "authenticated" && currentUserId) {
      // If user changed
      if (activeUserId.current !== currentUserId) {
        activeUserId.current = currentUserId;
        isInitialLoadDone.current = false;

        // Fetch WooCommerce cart for this specific account
        fetch("/api/account/cart")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.items && Array.isArray(data.items)) {
              setCartItems(data.items);
            } else {
              setCartItems([]);
            }
          })
          .catch(() => {})
          .finally(() => {
            isInitialLoadDone.current = true;
          });

        // Fetch WooCommerce wishlist for this specific account
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
      // When signed out, clear in-memory cart and wishlist
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
    cartHydrated,
    wishlistHydrated,
    setCartItems,
    setWishlistItems,
    clearCart,
    clearWishlist,
  ]);

  // Sync Cart to WooCommerce when modified by authenticated user
  useEffect(() => {
    if (status !== "authenticated" || !activeUserId.current || !isInitialLoadDone.current) return;

    const timer = setTimeout(() => {
      fetch("/api/account/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [cartItems, status]);

  // Sync Wishlist to WooCommerce when modified by authenticated user
  useEffect(() => {
    if (status !== "authenticated" || !activeUserId.current || !isInitialLoadDone.current) return;

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
