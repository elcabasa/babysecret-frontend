"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, ShoppingCart, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { CartCount } from "@/components/cart/cart-count";
import { SearchControl } from "@/components/layout/search-control";
import { AccountMenu } from "@/components/layout/account-menu";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { useWishlistStore } from "@/store/wishlist.store";

const logoImage = "/logo.png";

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

        <DesktopNav pathname={pathname} />

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
        <MobileMenu
          pathname={pathname}
          wishlistCount={wishlistCount}
          accountHref={accountHref}
          accountLabel={accountLabel}
          signedIn={signedIn}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}