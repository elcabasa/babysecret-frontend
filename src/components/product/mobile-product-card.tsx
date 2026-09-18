import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export function MobileProductCard({ product }: { product: Product }) {
  const slug = product.slug ?? product.id;
  const soldOut = product.stockStatus === "out-of-stock";

  return (
    <article className="flex h-36 w-full max-w-[358px] overflow-hidden rounded-xl glass-panel">
      <Link href={`/product/${slug}`} className="relative block h-28 w-28 shrink-0 self-center ml-4">
        <div className="relative h-28 w-28 overflow-hidden rounded-lg glass-control p-2">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        {product.badge && !soldOut && (
          <span className="absolute -top-1 -left-1 z-10 rounded-full bg-[#0055B8] px-2 py-0.5 font-secondary text-[10px] font-bold uppercase leading-[15px] text-white">
            {product.badge}
          </span>
        )}
        {soldOut && (
          <span className="absolute -top-1 -left-1 z-10 rounded-full bg-[#FFF0ED] px-2 py-0.5 font-secondary text-[10px] font-bold uppercase leading-[15px] text-[#E05345]">
            Sold out
          </span>
        )}
      </Link>

      <div className="ml-3 flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
        <p className="truncate font-secondary text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-[#003F8B]">
          {product.category}
        </p>
        <h3 className="mt-0.5 truncate text-[15px] font-bold leading-[20.63px] text-[#142F54]">
          <Link href={`/product/${slug}`} className="block truncate">
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-[16.5px] text-[#424753]">
          {product.shortDescription || product.description}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="text-[16px] font-bold leading-5 text-[#142F54]">
              {formatPrice(product.price)}
            </span>
            {product.regularPrice && product.regularPrice > product.price && (
              <span className="font-secondary text-xs leading-4 text-[#737784] line-through">
                {formatPrice(product.regularPrice)}
              </span>
            )}
          </div>
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </article>
  );
}