"use client";

import { signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

export function SignOutButton({
  className = "rounded-full border border-[#d6e0f0] bg-white px-5 py-3 text-sm font-semibold text-[#102a43] transition hover:bg-[#f3f7ff]",
  children = "Sign out",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const handleSignOut = async () => {
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      {children}
    </button>
  );
}
