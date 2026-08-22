import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { getProducts } from "@/services/product.service";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const products = await getProducts({ perPage: 100, category });
  const title = category.replaceAll("-", " ").replace(/\band\b/g, "&");
  return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto max-w-[1200px]"><Link href="/shop" className="text-sm text-[#3051a0]">Back to shop</Link><h1 className="mt-7 text-5xl font-medium capitalize">{title}</h1><p className="mt-3 text-[#334f6d]">Care selected for your little one&apos;s everyday routine.</p>{products.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="glass-panel mt-10 rounded-2xl p-8"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-2 text-[#334f6d]">This category is currently empty.</p></div>}</div></main>;
}
