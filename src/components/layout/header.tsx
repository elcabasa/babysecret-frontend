"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CartCount } from "@/components/cart/cart-count";
import { AccountMenu } from "@/components/layout/account-menu";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchControl } from "@/components/layout/search-control";
import { useWishlistStore } from "@/store/wishlist.store";

const logoImage = "/logo.png";

function MobileSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full glass-control text-[#142F54] transition"
        aria-label={open ? "Close search" : "Open search"}
        aria-expanded={open}
      >
        <Search size={18} />
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="absolute right-0 top-12 z-30 flex w-[min(86vw,320px)] items-center gap-2 rounded-full glass-panel px-4 py-1.5"
        >
          <Search size={16} className="shrink-0 text-[#0055B8]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search baby care"
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#142F54] outline-none placeholder:text-[#737784]"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="shrink-0 rounded-full bg-[#0055B8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="grid size-7 shrink-0 place-items-center rounded-full text-[#424753] hover:bg-white/30"
          >
            <X size={15} />
          </button>
        </form>
      )}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const accountHref = signedIn ? "/account" : "/login";
  const accountLabel = signedIn ? "My Account" : "Sign in";
  const wishlistCount = useWishlistStore((state) =>
    state.hasHydrated ? state.items.length : 0,
  );

  return (
    <>
      <header className="glass-panel absolute left-1/2 top-8 z-20 hidden w-[calc(100%-2rem)] max-w-[1200px] -translate-x-1/2 items-center justify-between rounded-[18px] px-5 py-3.5 sm:px-8 md:flex">
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
            className={`relative grid size-10 place-items-center rounded-full glass-control transition ${
              pathname === "/cart"
                ? "ring-2 ring-[#005dbd] ring-offset-1"
                : ""
            }`}
            aria-label="Cart"
          >
            <ShoppingCart
              size={18}
              className={
                pathname === "/cart" ? "text-[#005dbd]" : "text-[#3051a0]"
              }
            />
            <CartCount />
          </Link>

          <Link
            href="/wishlist"
            className={`relative hidden size-10 place-items-center rounded-full glass-control transition sm:grid ${
              pathname === "/wishlist"
                ? "ring-2 ring-[#005dbd] ring-offset-1"
                : ""
            }`}
            aria-label="Wishlist"
          >
            <Heart
              size={18}
              className={
                pathname === "/wishlist" ? "text-[#005dbd]" : "text-[#3051a0]"
              }
            />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full glass-badge px-1 text-[10px] font-bold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>

          <div className="hidden sm:block">
            <SearchControl />
          </div>

          <AccountMenu />
        </div>
      </header>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between glass-panel px-4 md:hidden">
        <div className="flex items-center gap-1.5">
          <button
            className="grid size-10 place-items-center rounded-full glass-control text-[#142F54] transition"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" aria-label="Baby Secret home" className="shrink-0">
            <Image src={logoImage} alt="Baby Secret" width={96} height={12} unoptimized />
          </Link>
        </div>

        <div className="flex items-center gap-0.5">
          <MobileSearch />
          <Link
            href="/wishlist"
            className="relative grid size-10 place-items-center rounded-full glass-control text-[#142F54] transition"
            aria-label="Wishlist"
          >
            <Heart size={18} />
            {wishlistCount > 0 && (
              <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full glass-badge px-1 text-[9px] font-bold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
            className="relative grid size-10 place-items-center rounded-full glass-control text-[#142F54] transition"
            aria-label="Cart"
          >
            <ShoppingCart size={18} />
            <CartCount />
          </Link>
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