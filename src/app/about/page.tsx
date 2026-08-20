import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";

const image = "https://www.figma.com/api/mcp/asset/46068686-cfa6-4158-b25a-e7eb87eccb96.png";
export default function AboutPage() { return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">Our story</p><h1 className="mt-4 text-5xl font-semibold text-[#243718]">Thoughtfully made for delicate skin.</h1><p className="mt-6 text-lg leading-8 text-[#334f6d]">Baby Secret is built around the small routines that make family life feel cared for: first baths, soft skin after moisturising, and the everyday moments in between.</p><Link href="/shop" className="mt-8 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white">Explore care</Link></div><div className="relative min-h-[480px] overflow-hidden rounded-2xl"><Image src={image} alt="Baby receiving gentle care during bath time" fill className="object-cover" unoptimized /></div></div></main>; }
