import Image from "next/image";
import Link from "next/link";

import { Header } from "@/components/layout/header";

const heroImage = "/hero-scene.png";

export function HeroSection({ authSuccess }: { authSuccess?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#c9e7fb]">
      <div className="relative aspect-[2880/1926] w-full md:absolute md:inset-0 md:aspect-auto">
        <Image
          src={heroImage}
          alt="Baby Secret mother and child care scene"
          fill
          priority
          className="object-cover object-[62%_center] md:object-center"
          unoptimized
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/10 to-transparent" />

      {authSuccess && (
        <div className="absolute left-1/2 top-2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-5 py-1.5 text-sm font-semibold text-green-700 shadow-sm">
          {authSuccess}
        </div>
      )}

      <Header />

      <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-col justify-center px-6 pb-16 pt-10 sm:px-10 md:min-h-[720px] md:pt-24 lg:px-0">
        <div className="max-w-[740px]">
          <h1 className="max-w-[740px] text-5xl font-semibold leading-[1.08] tracking-tight text-[#343030] sm:text-6xl lg:text-7xl">
            Gentle care for every little moment.
          </h1>
          <p className="mt-6 max-w-[688px] text-base leading-7 text-[#161616] sm:text-xl">
            From first baths to bedtime cuddles, Baby Secret helps you care for your little one’s delicate skin with products made for everyday tenderness.
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
    </section>
  );
}