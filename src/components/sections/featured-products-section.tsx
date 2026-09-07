import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/product";

export function FeaturedProductsSection({ products }: { products: Product[] }) {
  return (
    <section className="px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <h2 className="text-2xl font-medium tracking-tight sm:text-4xl">
            Their little routine starts here.
          </h2>
          <p className="mt-2 text-sm text-[#334f6d] sm:text-lg">
            Everyday essentials for bath time, moisturising, massage and
            everything in between.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#010408] px-8 py-3 text-sm font-semibold transition hover:bg-[#010408] hover:text-white"
          >
            View All Products <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
