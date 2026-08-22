"use client";
import Link from "next/link";
export default function SearchError({ reset }: { reset: () => void }) { return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><div className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-semibold">Search is temporarily unavailable</h1><button onClick={reset} className="mt-6 rounded-full bg-[#005dbd] px-6 py-3 font-semibold text-white">Try again</button><Link href="/shop" className="ml-3 font-semibold text-[#3051a0]">Browse shop</Link></div></main>; }
