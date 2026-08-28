import Image from "next/image";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const slug = product.slug ?? product.id;
  return <article className="group overflow-hidden rounded-xl border border-[#e5e3e3] bg-white"><div className="relative"><Link href={`/product/${slug}`} className="block"><div className="relative h-[260px] overflow-hidden bg-[#edf7f8] sm:h-[300px]"><Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" unoptimized />{product.badge && product.stockStatus !== "out-of-stock" && <span className="absolute left-3 top-3 z-10 rounded-full bg-[#005dbd] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">{product.badge}</span>}</div><div className="px-4 pt-4"><p className="text-xs text-[#005dbd]">{product.category}</p><h3 className="mt-2 truncate font-medium text-[#010408]">{product.name}</h3><p className="mt-1 truncate text-xs text-[#7c7979]">{product.description}</p></div></Link><div className="absolute right-3 top-3"><WishlistButton product={product} /></div></div><div className="flex items-center justify-between p-4 pt-5"><strong className="text-sm text-[#010408]">{formatPrice(product.price)}</strong><AddToCartButton product={product} compact /></div></article>;
}
