"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Package, User2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

export function AccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated" || !session?.user) {
    return (
      <Link
        href="/login"
        className="hidden rounded-full bg-[#3051a0] px-4 py-2 text-sm text-white transition hover:bg-[#26407f] sm:block"
      >
        Sign in
      </Link>
    );
  }

  const firstName =
    session.user.name?.split(" ")[0] ?? session.user.email ?? "User";

  return (
    <div className="relative hidden sm:block">
      {open && (
        <button
          type="button"
          aria-label="Close account menu"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setOpen(false)}
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-[#3051a0] px-4 py-2 text-sm text-white transition hover:bg-[#26407f]"
      >
        <span className="grid size-5 place-items-center rounded-full bg-white/20 text-[10px] font-bold uppercase">
          {firstName.charAt(0)}
        </span>
        {firstName}
        <ChevronDown
          size={14}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl glass-panel p-2">
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#102a43] transition hover:bg-[#f3f7ff]"
          >
            <Package size={16} className="text-[#3051a0]" />
            My Orders
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#102a43] transition hover:bg-[#f3f7ff]"
          >
            <User2 size={16} className="text-[#3051a0]" />
            My Account
          </Link>
          <div className="mt-1 border-t border-[#e6edf7] pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                useCartStore.getState().clearCart();
                useWishlistStore.getState().clearWishlist();
                signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
