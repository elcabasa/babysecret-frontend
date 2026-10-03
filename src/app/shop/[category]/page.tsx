import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { getProducts } from "@/services/product.service";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const products = await getProducts({ perPage: 100, category });
  const title = category.replaceAll("-", " ").replace(/\band\b/g, "&");

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-[1200px]">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005dbd] transition hover:underline"
        >
          <ArrowLeft size={16} /> Back to Catalog
        </Link>

        <h1 className="mt-6 text-4xl font-semibold capitalize text-[#102a43] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-lg text-[#334f6d]">
          Care selected for your little one&apos;s everyday routine.
        </p>

        {products.length ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="glass-panel mt-10 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-[#102a43]">
              No products found
            </h2>
            <p className="mt-2 text-[#334f6d]">
              This category is currently empty.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[#005dbd] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004d9c]"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
