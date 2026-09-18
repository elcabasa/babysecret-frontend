"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { isLinkActive, navLinks } from "@/components/layout/nav-links";
import { SearchControl } from "@/components/layout/search-control";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

type MobileMenuProps = {
  pathname: string;
  wishlistCount: number;
  accountHref: string;
  accountLabel: string;
  signedIn: boolean;
  onClose: () => void;
};

const linkClasses =
  "rounded-xl px-3.5 py-2.5 transition text-[#102a43] hover:bg-slate-100";

const activeLinkClasses =
  "rounded-xl px-3.5 py-2.5 transition bg-[#e7effc] font-semibold text-[#005dbd]";

const wishlistClasses =
  "flex items-center justify-between rounded-xl px-3.5 py-2.5 transition text-[#102a43] hover:bg-slate-100";

const activeWishlistClasses =
  "flex items-center justify-between rounded-xl px-3.5 py-2.5 transition bg-[#e7effc] font-semibold text-[#005dbd]";

export function MobileMenu({
  pathname,
  wishlistCount,
  accountHref,
  accountLabel,
  signedIn,
  onClose,
}: MobileMenuProps) {
  return (
    <nav className="glass-panel absolute left-4 right-4 top-24 z-20 rounded-2xl p-5 shadow-xl md:hidden">
      <div className="grid gap-2 text-sm">
        <div className="mb-2">
          <SearchControl />
        </div>

        {navLinks.map((link) => {
          const active = isLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={active ? activeLinkClasses : linkClasses}
            >
              {link.label}
            </Link>
          );
        })}

        <Link
          href="/wishlist"
          onClick={onClose}
          className={
            pathname === "/wishlist" ? activeWishlistClasses : wishlistClasses
          }
        >
          <span>Wishlist</span>
          {wishlistCount > 0 && (
            <span className="rounded-full bg-[#005dbd] px-2 py-0.5 text-xs font-bold text-white">
              {wishlistCount}
            </span>
          )}
        </Link>

        <Link
          href={accountHref}
          onClick={onClose}
          className={pathname === accountHref ? activeLinkClasses : linkClasses}
        >
          {accountLabel}
        </Link>

        {signedIn && (
          <>
            <Link
              href="/orders"
              onClick={onClose}
              className={
                pathname === "/orders" ? activeLinkClasses : linkClasses
              }
            >
              My Orders
            </Link>

            <button
              type="button"
              onClick={() => {
                onClose();
                useCartStore.getState().clearCart();
                useWishlistStore.getState().clearWishlist();
                signOut({ callbackUrl: "/login" });
              }}
              className="rounded-xl px-3.5 py-2.5 text-left font-medium text-red-700 transition hover:bg-red-50"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
