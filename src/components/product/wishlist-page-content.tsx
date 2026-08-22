"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist.store";
import { ProductCard } from "@/components/product/product-card";
export function WishlistPageContent() { const items = useWishlistStore((state) => state.items); const hydrated = useWishlistStore((state) => state.hasHydrated); if (!hydrated) return <div className="glass-panel mt-10 rounded-2xl p-8 text-center text-[#334f6d]">Loading your wishlist…</div>; if (!items.length) return <div className="glass-panel mt-10 rounded-2xl p-10 text-center"><Heart className="mx-auto text-[#3051a0]" size={36} /><h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2><p className="mt-2 text-[#334f6d]">Save products you love and find them here later.</p><Link href="/shop" className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white">Discover products</Link></div>; return <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>; }
