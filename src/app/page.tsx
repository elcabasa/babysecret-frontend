import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Baby, Heart, Sparkles, Sprout } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { RoutineSection } from "@/components/sections/routine-section";
import { getFeaturedProducts } from "@/services/product.service";
import { Footer } from "@/components/layout/footer";

const heroImage = "https://www.figma.com/api/mcp/asset/9ac030fe-cd9e-4804-90e5-c98dd157a35a.png";
const brandStoryImage = "https://www.figma.com/api/mcp/asset/aec590cd-efac-4007-a740-a0c41e2eb110.png";
const brandStoryOverlay = "https://www.figma.com/api/mcp/asset/c7a07372-cf6a-4e7a-b6d5-9755853c21fc.png";

const benefits = [
  { title: "Gentle on delicate skin", text: "Everyday care designed with your little one's skin in mind.", icon: Heart },
  { title: "Made with care", text: "Thoughtfully developed products for everyday family routines.", icon: Sparkles },
  { title: "From baby to growing years", text: "Care that grows with your child.", icon: Sprout },
  { title: "Loved by families", text: "Products made for the moments parents cherish.", icon: Baby },
];

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  return <main className="min-h-screen bg-white text-[#010408]">
    <section className="relative min-h-[720px] overflow-hidden bg-[#c9e7fb]"><Image src={heroImage} alt="Baby Secret mother and child care scene" fill priority className="object-cover object-[62%_center] sm:object-center" unoptimized /><div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/10 to-transparent" /><Header /><div className="relative z-[1] mx-auto flex min-h-[720px] max-w-[1200px] items-center px-6 pt-24 sm:px-10 lg:px-0"><div className="max-w-[740px]"><h1 className="max-w-[740px] text-5xl font-semibold leading-[1.08] tracking-tight text-[#343030] sm:text-6xl lg:text-7xl">Gentle care for every little moment.</h1><p className="mt-6 max-w-[688px] text-base leading-7 text-[#161616] sm:text-xl">From first baths to bedtime cuddles, Baby Secret helps you care for your little one’s delicate skin with products made for everyday tenderness.</p><div className="mt-8 flex flex-wrap gap-4"><Link href="/shop" className="rounded-full bg-[#005dbd] px-8 py-4 font-semibold text-white transition hover:bg-[#004d9c]">Shop Baby Care</Link><Link href="/about" className="rounded-full border border-[#005dbd] px-8 py-4 text-[#161616] transition hover:bg-white/70">Our Story</Link></div></div></div></section>

    <section className="border-b border-[#efebe2]/60 bg-[#f9fcff] px-6 py-16 sm:px-10"><div className="mx-auto max-w-[1200px]"><h2 className="text-center text-3xl font-medium">Made for little moments.</h2><div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({ title, text, icon: Icon }) => <div key={title} className="text-center"><div className="mx-auto grid size-14 place-items-center rounded-xl bg-[#e7effc] text-[#005dbd]"><Icon size={24} /></div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-[#334f6d]">{text}</p></div>)}</div></div></section>

    <section className="px-6 py-20 sm:px-10"><div className="mx-auto max-w-[1200px]"><div className="mb-8"><h2 className="text-4xl font-medium tracking-tight">Their little routine starts here.</h2><p className="mt-2 text-lg text-[#334f6d]">Everyday essentials for bath time, moisturising, massage and everything in between.</p></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div><div className="mt-12 text-center"><Link href="/shop" className="inline-flex items-center gap-2 rounded-full border-2 border-[#010408] px-8 py-3 text-sm font-semibold transition hover:bg-[#010408] hover:text-white">View All Products <ArrowRight size={16} /></Link></div></div></section>

    <RoutineSection />

    <section className="relative min-h-[620px] overflow-hidden bg-[#343434] sm:min-h-[760px]"><Image src={brandStoryImage} alt="A child surrounded by Baby Secret products" fill className="object-cover" unoptimized /><Image src={brandStoryOverlay} alt="" fill className="object-cover mix-blend-soft-light" unoptimized /><div className="absolute inset-0 bg-black/15" /><div className="relative z-[1] mx-auto flex min-h-[620px] max-w-[1200px] items-center px-6 py-20 sm:min-h-[760px] sm:px-10 lg:px-0"><div className="max-w-[576px] text-white"><p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">Brand Story</p><h2 className="mt-4 text-5xl font-medium leading-none sm:text-6xl">The little things are everything.</h2><ul className="mt-7 space-y-2 text-lg font-light text-white/85"><li>The tiny hands.</li><li>The sleepy smiles.</li><li>The bath-time splashes.</li><li>The smell after a fresh bath.</li><li>The cuddles before bedtime.</li></ul><p className="mt-8 text-base text-white/75 sm:text-lg">These are the moments we make Baby Secret for.</p><p className="mt-4 text-2xl font-medium italic text-white sm:text-3xl">Because growing up happens once.</p></div></div></section>

    <Footer />
  </main>;
}
