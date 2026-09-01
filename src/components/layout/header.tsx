"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, ShoppingCart, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { CartCount } from "@/components/cart/cart-count";
import { SearchControl } from "@/components/layout/search-control";
import { AccountMenu } from "@/components/layout/account-menu";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

const logoImage = "/logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Catalog" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const accountHref = signedIn ? "/account" : "/login";
  const accountLabel = signedIn ? "My Account" : "Sign in";
  const wishlistCount = useWishlistStore((state) =>
    state.hasHydrated ? state.items.length : 0
  );

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="glass-panel absolute left-1/2 top-8 z-20 flex w-[calc(100%-2rem)] max-w-[1200px] -translate-x-1/2 items-center justify-between rounded-[18px] px-5 py-3.5 sm:px-8">
        <Link href="/" aria-label="Baby Secret home" className="shrink-0">
          <Image
            src={logoImage}
            alt="Baby Secret"
            width={149}
            height={19}
            unoptimized
          />
        </Link>

        <nav className="hidden items-center gap-2 text-sm md:flex">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 font-medium transition-all ${
                  active
                    ? "bg-[#e7effc] font-semibold text-[#005dbd] shadow-xs"
                    : "text-[#334f6d] hover:bg-black/5 hover:text-[#005dbd]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className={`relative grid size-10 place-items-center rounded-full bg-white shadow-sm transition ${
              pathname === "/cart"
                ? "ring-2 ring-[#005dbd] ring-offset-1"
                : "hover:bg-slate-50"
            }`}
            aria-label="Cart"
          >
            <ShoppingCart
              size={18}
              className={pathname === "/cart" ? "text-[#005dbd]" : "text-[#3051a0]"}
            />
            <CartCount />
          </Link>

          <Link
            href="/wishlist"
            className={`relative hidden size-10 place-items-center rounded-full bg-white shadow-sm transition sm:grid ${
              pathname === "/wishlist"
                ? "ring-2 ring-[#005dbd] ring-offset-1"
                : "hover:bg-slate-50"
            }`}
            aria-label="Wishlist"
          >
            <Heart
              size={18}
              className={pathname === "/wishlist" ? "text-[#005dbd]" : "text-[#3051a0]"}
            />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#005dbd] px-1 text-[10px] font-bold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>

          <div className="hidden sm:block">
            <SearchControl />
          </div>

          <AccountMenu />

          <button
            className="grid size-10 place-items-center rounded-full bg-[#3051a0] text-white md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <nav className="glass-panel absolute left-4 right-4 top-24 z-20 rounded-2xl p-5 md:hidden shadow-xl">
          <div className="grid gap-2 text-sm">
            <div className="mb-2">
              <SearchControl />
            </div>

            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3.5 py-2.5 transition ${
                    active
                      ? "bg-[#e7effc] font-semibold text-[#005dbd]"
                      : "text-[#102a43] hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/wishlist"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition ${
                pathname === "/wishlist"
                  ? "bg-[#e7effc] font-semibold text-[#005dbd]"
                  : "text-[#102a43] hover:bg-slate-100"
              }`}
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
              onClick={() => setOpen(false)}
              className={`rounded-xl px-3.5 py-2.5 transition ${
                pathname === accountHref
                  ? "bg-[#e7effc] font-semibold text-[#005dbd]"
                  : "text-[#102a43] hover:bg-slate-100"
              }`}
            >
              {accountLabel}
            </Link>

            {signedIn && (
              <>
                <Link
                  href="/orders"
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3.5 py-2.5 transition ${
                    pathname === "/orders"
                      ? "bg-[#e7effc] font-semibold text-[#005dbd]"
                      : "text-[#102a43] hover:bg-slate-100"
                  }`}
                >
                  My Orders
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
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
      )}
    </>
  );
}
