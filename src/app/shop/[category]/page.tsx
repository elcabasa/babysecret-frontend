import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { getFeaturedProducts } from "@/services/product.service";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const products = await getFeaturedProducts();
  const title = category.replaceAll("-", " ").replace(/\band\b/g, "&");
  const filtered = products.filter((product) => product.category.toLowerCase().replaceAll(" & ", "-").replaceAll(" ", "-") === category);
  return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto max-w-[1200px]"><Link href="/shop" className="text-sm text-[#3051a0]">← Back to shop</Link><h1 className="mt-7 text-5xl font-medium capitalize">{title}</h1><p className="mt-3 text-[#334f6d]">Care selected for your little one&apos;s everyday routine.</p><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{(filtered.length ? filtered : products).map((product) => <ProductCard key={product.id} product={product} />)}</div></div></main>;
}
