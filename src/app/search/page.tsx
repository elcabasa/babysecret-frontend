import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { searchProducts } from "@/services/product.service";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = await searchProducts(q);
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
          Product search
        </p>
        <h1 className="mt-3 text-5xl font-medium">
          {q ? `Results for “${q}”` : "Search Baby Secret"}
        </h1>
        {!q ? (
          <div className="glass-panel mt-10 rounded-2xl p-8 text-[#334f6d]">
            Use the search icon in the header to find products by name or
            category.
          </div>
        ) : products.length ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="glass-panel mt-10 rounded-2xl p-8">
            <h2 className="text-xl font-semibold">No products found</h2>
            <p className="mt-2 text-[#334f6d]">
              Try another product name or browse the full catalog.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
            >
              Browse products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
