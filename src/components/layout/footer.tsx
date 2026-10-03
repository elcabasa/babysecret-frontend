import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { siteConfig } from "@/data/site";

const shopLinks = [
  { href: "/shop", label: "All Products" },
  { href: "/shop/bath-and-wash", label: "Bath & Wash" },
  { href: "/shop/baby-care", label: "Baby Care" },
];
const helpLinks = [
  { href: "/contact", label: "Contact Us" },
  { href: "/shipping", label: "Delivery" },
  { href: "/returns", label: "Returns" },
  { href: "/faq", label: "FAQs" },
];
const discoverLinks = [
  { href: "/about", label: "Our Story" },
  { href: "/blog", label: "Care Guide" },
  { href: "/wishlist", label: "Wishlist" },
];

const columnHeadClass =
  "font-secondary text-[11px] font-bold uppercase tracking-[0.5px] text-[#0055B8]";

export function Footer() {
  return (
    <footer>
      {/* Mobile: Figma 3-column footer - Dark mode */}
      <div className="bg-[#030507] px-4 py-10 md:hidden">
        <div className="mx-auto max-w-[358px]">
          <h2 className="text-center text-lg font-bold text-white">
            {siteConfig.name}
          </h2>
          <p className="mt-1 text-center text-[12px] leading-[18px] text-white/60">
            {siteConfig.tagline}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div>
              <h3 className={columnHeadClass}>Shop</h3>
              <div className="mt-4 space-y-3">
                {shopLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block text-[12px] leading-[18px] text-white/70 transition hover:text-[#0055B8]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className={columnHeadClass}>Help</h3>
              <div className="mt-4 space-y-3">
                {helpLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block text-[12px] leading-[18px] text-white/70 transition hover:text-[#0055B8]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className={columnHeadClass}>Discover</h3>
              <div className="mt-4 space-y-3">
                {discoverLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block text-[12px] leading-[18px] text-white/70 transition hover:text-[#0055B8]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2 text-center text-[12px] leading-[18px]">
            <a className="block text-white/60 transition hover:text-white" href={`tel:${siteConfig.phone}`}>
              {siteConfig.displayPhone}
            </a>
            <a className="block text-white/60 transition hover:text-white" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </div>

          <div className="mt-8 border-t border-white/10 pb-8 pt-5 text-center text-[11px] leading-[16px] text-white/40">
            <span>© 2026 Baby Secret. All rights reserved.</span>
            <div className="mt-2 flex justify-center gap-4">
              <Link className="hover:text-white transition" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-white transition" href="/terms">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: existing footer */}
      <footer className="hidden bg-[#030507] px-6 py-16 text-white sm:px-10 md:block">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[2fr_1fr_1fr_1fr] gap-8">
          <div>
            <h2 className="text-xl font-semibold">{siteConfig.name}</h2>
            <p className="mt-5 text-sm text-white/60">{siteConfig.tagline}</p>
            <p className="mt-6 max-w-sm text-sm text-white/60">
              Thoughtful baby and children&apos;s care for the little moments
              families cherish.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-white/70">
              <a
                className="inline-flex items-center gap-2 hover:text-white"
                href={`tel:${siteConfig.phone}`}
              >
                <Phone size={15} />
                {siteConfig.displayPhone}
              </a>
              <a
                className="inline-flex items-center gap-2 hover:text-white"
                href={`mailto:${siteConfig.email}`}
              >
                <Mail size={15} />
                {siteConfig.email}
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-medium">Shop</h3>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <Link className="block" href="/shop">
                All Products
              </Link>
              <Link className="block" href="/shop/bath-and-wash">
                Bath & Wash
              </Link>
              <Link className="block" href="/shop/baby-care">
                Baby Care
              </Link>
              <Link className="block" href="/shop/hygiene">
                Hygiene
              </Link>
            </div>
          </div>
          <div>
            <h3 className="font-medium">Help</h3>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <Link className="block" href="/contact">
                Contact Us
              </Link>
              <Link className="block" href="/shipping">
                Delivery
              </Link>
              <Link className="block" href="/returns">
                Returns
              </Link>
              <Link className="block" href="/faq">
                FAQs
              </Link>
            </div>
          </div>
          <div>
            <h3 className="font-medium">Discover</h3>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <Link className="block" href="/about">
                Our Story
              </Link>
              <Link className="block" href="/blog">
                Baby Care Guide
              </Link>
              <Link className="block" href="/wishlist">
                Wishlist
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-14 flex max-w-[1200px] flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>© 2026 Baby Secret. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </footer>
  );
}