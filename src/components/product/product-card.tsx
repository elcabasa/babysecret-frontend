import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const slug = product.slug ?? product.id;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition hover:shadow-md sm:rounded-2xl">
      <div className="relative">
        <Link href={`/product/${slug}`} className="block">
          <div className="relative h-44 overflow-hidden bg-[#f3f7fb] sm:h-48 lg:h-56">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 260px"
              className="object-contain p-1 transition duration-300 group-hover:scale-[1.03] sm:p-3"
              unoptimized
            />
            {product.badge && product.stockStatus !== "out-of-stock" && (
              <span className="absolute left-2 top-2 z-10 rounded-full bg-[#005dbd] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:text-[11px]">
                {product.badge}
              </span>
            )}
          </div>

          <div className="p-2.5 pb-0 sm:p-4 sm:pb-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-[#005dbd] sm:text-xs sm:tracking-wider">
              {product.category}
            </p>
            <h3 className="mt-1 line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug text-[#102a43] sm:text-sm">
              {product.name}
            </h3>
            <p className="mt-1 hidden line-clamp-2 text-xs leading-relaxed text-[#62809e] sm:block">
              {product.shortDescription || product.description}
            </p>
          </div>
        </Link>

        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <WishlistButton product={product} />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-1.5 p-2.5 pt-3 sm:gap-2 sm:p-4 sm:pt-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span className="text-xs font-bold text-[#102a43] sm:text-base">
            {formatPrice(product.price)}
          </span>
          {product.regularPrice && product.regularPrice > product.price && (
            <span className="text-[10px] text-[#5a6b7e] line-through sm:text-xs">
              {formatPrice(product.regularPrice)}
            </span>
          )}
        </div>
        <AddToCartButton product={product} compact />
      </div>
    </article>
  );
}
