import Image from "next/image";
import Link from "next/link";

import { Header } from "@/components/layout/header";
import { CheckCircle } from "lucide-react";

const heroImage = "/hero-scene.png";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F8FC] to-[#F9F9FC] pt-16 md:pt-0">
      <Header />

      {/* Mobile hero (Figma mobile design) */}
      <div className="md:hidden">
        <div className="relative h-[243.75px] w-full overflow-hidden">
          <Image
            src={heroImage}
            alt="Baby Secret mother and child care scene"
            fill
            priority
            className="object-cover object-center"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

          <div className="absolute bottom-3 left-3 flex h-[22px] w-[176px] items-center gap-1.5 rounded-full bg-white/95 px-3 backdrop-blur-[6px] shadow-[0_4px_16px_rgba(20,47,84,0.15)] border border-[#D8E2FF]/50">
            <CheckCircle size={11} className="shrink-0 text-[#0055B8]" />
            <span className="truncate text-[10px] font-semibold leading-[22px] text-[#142F54]">
              Pediatrician Approved
            </span>
          </div>
        </div>

        <div className="px-4 pt-4 pb-10 text-center">
          <p className="font-secondary text-[11px] font-semibold uppercase leading-[14px] tracking-[0.55px] text-[#0055B8]">
            Tender care for little skin
          </p>
          <h1 className="mx-auto mt-3 max-w-[340px] text-[26px] font-bold leading-[32px] tracking-[-0.26px] text-[#142F54]">
            Gentle care for every little moment.
          </h1>
          <p className="mx-auto mt-3 max-w-[350px] text-sm leading-[22px] text-[#424753]">
            From first baths to bedtime cuddles, Baby Secret helps you care for
            your little one&apos;s delicate skin with products made for everyday
            tenderness.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/shop"
              className="flex h-11 w-[180px] items-center justify-center rounded-full bg-[#0055B8] px-4 py-3 text-[15px] font-semibold leading-5 text-white transition hover:bg-[#004a9f]"
            >
              Shop Baby Care
            </Link>
            <Link
              href="/about"
              className="flex h-11 w-[150px] items-center justify-center rounded-full bg-[#D6E3FF] px-4 py-3 text-[15px] font-semibold leading-5 text-[#003F8B] transition hover:bg-[#c3d6fb]"
            >
              Our Story
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop hero */}
      <div className="hidden md:block">
        <div className="relative aspect-[2880/1926] w-full md:absolute md:inset-0 md:aspect-auto">
          <Image
            src={heroImage}
            alt="Baby Secret mother and child care scene"
            fill
            priority
            className="object-cover object-center"
            unoptimized
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/10 to-transparent" />

        <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-col justify-center px-6 pb-16 pt-10 sm:px-10 md:min-h-[720px] md:pt-24 lg:px-0">
          <div className="max-w-[740px]">
            <p className="font-secondary text-[11px] font-semibold uppercase leading-[14px] tracking-[0.55px] text-[#0055B8]">
              Tender care for little skin
            </p>
            <h1 className="max-w-[740px] text-5xl font-semibold leading-[1.08] tracking-tight text-[#343030] sm:text-6xl lg:text-7xl">
              Gentle care for every little moment.
            </h1>
            <p className="mt-6 max-w-[688px] text-base leading-7 text-[#161616] sm:text-xl">
              From first baths to bedtime cuddles, Baby Secret helps you care
              for your little one’s delicate skin with products made for
              everyday tenderness.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="rounded-full bg-[#005dbd] px-8 py-4 font-semibold text-white transition hover:bg-[#004d9c]"
              >
                Shop Baby Care
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-[#005dbd] px-8 py-4 text-[#161616] transition hover:bg-white/70"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}