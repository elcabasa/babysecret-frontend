import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { getFeaturedProducts } from "@/services/product.service";

export default async function ShopPage() {
  const products = await getFeaturedProducts();
  return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto max-w-[1200px]"><div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">Catalog</p><h1 className="mt-3 text-5xl font-medium">Everyday care, made simple.</h1><p className="mt-3 max-w-xl text-[#334f6d]">Explore Baby Secret essentials for bath time, moisturising, massage, and gentle clean-ups.</p></div><div className="glass-control flex items-center gap-2 rounded-full px-4 py-2 text-sm"><span>Sort by</span><select className="bg-transparent font-medium outline-none"><option>Featured</option><option>Price: Low to High</option><option>Price: High to Low</option></select></div></div><div className="mb-8 flex flex-wrap gap-2">{["All products", "Bath & Wash", "Baby Care", "Hygiene"].map((filter) => <Link key={filter} href={filter === "All products" ? "/shop" : `/shop/${filter.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`} className="glass-control rounded-full px-4 py-2 text-sm transition hover:bg-white">{filter}</Link>)}</div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></main>;
}
