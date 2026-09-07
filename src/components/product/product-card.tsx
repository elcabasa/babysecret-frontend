import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const slug = product.slug ?? product.id;

  return (
    <article className="glass-card group flex flex-col justify-between overflow-hidden rounded-2xl transition hover:shadow-lg">
      <div className="relative">
        <Link href={`/product/${slug}`} className="block">
          <div className="relative h-[180px] overflow-hidden bg-[#eef5fc] sm:h-[280px]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            {product.badge && product.stockStatus !== "out-of-stock" && (
              <span className="absolute left-2 top-2 z-10 rounded-full bg-[#005dbd] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[11px]">
                {product.badge}
              </span>
            )}
          </div>

          <div className="p-3 pb-0 sm:p-4 sm:pb-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#005dbd] sm:text-xs">
              {product.category}
            </p>
            <h3 className="mt-1 truncate text-xs font-semibold text-[#102a43] sm:text-sm">
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#43617e] sm:text-xs sm:leading-relaxed">
              {product.shortDescription || product.description}
            </p>
          </div>
        </Link>

        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <WishlistButton product={product} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 p-3 pt-2 sm:gap-0 sm:p-4 sm:pt-3">
        <div className="min-w-0">
          <span className="text-[13px] font-bold text-[#102a43] sm:text-base">
            {formatPrice(product.price)}
          </span>
          {product.regularPrice && product.regularPrice > product.price && (
            <span className="ml-1.5 text-[10px] text-[#64809e] line-through sm:ml-2 sm:text-xs">
              {formatPrice(product.regularPrice)}
            </span>
          )}
        </div>
        <AddToCartButton product={product} compact />
      </div>
    </article>
  );
}
