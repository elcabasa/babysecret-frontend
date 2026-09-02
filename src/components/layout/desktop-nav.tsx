"use client";

import Link from "next/link";

import { isLinkActive, navLinks } from "@/components/layout/nav-links";

export function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden items-center gap-2 text-sm md:flex">
      {navLinks.map((link) => {
        const active = isLinkActive(pathname, link.href);
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
  );
}