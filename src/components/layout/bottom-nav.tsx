"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, ShoppingBag, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/store/wishlist.store";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const wishlistCount = useWishlistStore((state) =>
    state.hasHydrated ? state.items.length : 0,
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const accountHref = status === "authenticated" ? "/account" : "/login";
  const accountActive = isActive("/account") || isActive("/login");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 w-full items-stretch glass-panel md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
            aria-label={label}
          >
            <span className="relative grid h-7 w-10 place-items-center">
              <Icon
                size={20}
                strokeWidth={active ? 2.2 : 1.8}
                className={`transition ${active ? "text-[#0055B8]" : "text-[#737784]"}`}
              />
              {href === "/wishlist" && wishlistCount > 0 && (
                <span className="absolute -right-0.5 top-0 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-[#0055B8] px-0.5 text-[8px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </span>
            <span
              className={`text-[10px] leading-[14px] transition ${
                active ? "font-secondary font-bold text-[#0055B8]" : "font-secondary font-semibold text-[#737784]"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}

      <Link
        href={accountHref}
        className="flex flex-1 flex-col items-center justify-center gap-0.5"
        aria-label={status === "authenticated" ? "Account" : "Sign in"}
      >
        <span className="grid h-7 w-10 place-items-center">
          <User
            size={20}
            strokeWidth={accountActive ? 2.2 : 1.8}
            className={`transition ${accountActive ? "text-[#0055B8]" : "text-[#737784]"}`}
          />
        </span>
        <span
          className={`text-[10px] leading-[14px] transition ${
            accountActive
              ? "font-secondary font-bold text-[#0055B8]"
              : "font-secondary font-semibold text-[#737784]"
          }`}
        >
          Account
        </span>
      </Link>
    </nav>
  );
}