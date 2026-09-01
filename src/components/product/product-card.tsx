import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const slug = product.slug ?? product.id;

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition hover:shadow-md">
      <div className="relative">
        <Link href={`/product/${slug}`} className="block">
          <div className="relative h-[260px] overflow-hidden bg-[#f3f7fb] sm:h-[280px]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            {product.badge && product.stockStatus !== "out-of-stock" && (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-[#005dbd] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">
                {product.badge}
              </span>
            )}
          </div>

          <div className="p-4 pb-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#005dbd]">
              {product.category}
            </p>
            <h3 className="mt-1 truncate font-semibold text-[#102a43]">
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#62809e]">
              {product.shortDescription || product.description}
            </p>
          </div>
        </Link>

        <div className="absolute right-3 top-3 z-10">
          <WishlistButton product={product} />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 pt-3">
        <div>
          <span className="text-base font-bold text-[#102a43]">
            {formatPrice(product.price)}
          </span>
          {product.regularPrice && product.regularPrice > product.price && (
            <span className="ml-2 text-xs text-[#9aaeba] line-through">
              {formatPrice(product.regularPrice)}
            </span>
          )}
        </div>
        <AddToCartButton product={product} compact />
      </div>
    </article>
  );
}
