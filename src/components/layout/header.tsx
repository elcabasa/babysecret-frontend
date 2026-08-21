"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { CartCount } from "@/components/cart/cart-count";
import { SearchControl } from "@/components/layout/search-control";

const logoImage = "https://www.figma.com/api/mcp/asset/def360c0-e3d3-4373-bfa6-8e0019352473.png";

export function Header() {
  const [open, setOpen] = useState(false);
  return <>
    <header className="glass-panel absolute left-1/2 top-8 z-20 flex w-[calc(100%-2rem)] max-w-[1200px] -translate-x-1/2 items-center justify-between rounded-[18px] px-5 py-4 sm:px-8">
      <Link href="/" aria-label="Baby Secret home"><Image src={logoImage} alt="Baby Secret" width={149} height={19} unoptimized /></Link>
      <nav className="hidden items-center gap-8 text-sm md:flex"><Link className="font-medium text-[#3051a0]" href="/">Home</Link><Link href="/shop">Catalog</Link><Link href="/about">About Us</Link><Link href="/contact">Contact</Link></nav>
      <div className="flex items-center gap-3"><Link href="/cart" className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm" aria-label="Cart"><ShoppingCart size={18} className="text-[#3051a0]" /><CartCount /></Link><div className="hidden sm:block"><SearchControl /></div><Link href="/account" className="hidden rounded-full bg-[#3051a0] px-4 py-2 text-sm text-white sm:block">My Account</Link><button className="grid size-10 place-items-center rounded-full bg-[#3051a0] text-white md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
    </header>
    {open && <nav className="glass-panel absolute left-4 right-4 top-24 z-20 rounded-xl p-5 md:hidden"><div className="grid gap-4 text-sm"><SearchControl /><Link href="/" onClick={() => setOpen(false)}>Home</Link><Link href="/shop" onClick={() => setOpen(false)}>Catalog</Link><Link href="/about" onClick={() => setOpen(false)}>About Us</Link><Link href="/contact" onClick={() => setOpen(false)}>Contact</Link><Link href="/account" onClick={() => setOpen(false)}>My Account</Link></div></nav>}
  </>;
}
