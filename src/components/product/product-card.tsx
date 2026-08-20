import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/data/products";
import Link from "next/link";

export function ProductCard({ product }: { product: Product }) {
  return <article className="group overflow-hidden rounded-xl border border-[#e5e3e3] bg-white"><Link href={`/product/${product.id}`} className="block"><div className="relative h-[260px] overflow-hidden bg-[#edf7f8] sm:h-[300px]"><Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" unoptimized />{product.badge && <span className="absolute left-4 top-4 rounded-full bg-[#00123e] px-3 py-1 text-[11px] text-white">{product.badge}</span>}</div><div className="p-4"><p className="text-xs text-[#005dbd]">{product.category}</p><h3 className="mt-2 truncate font-medium text-[#010408]">{product.name}</h3><p className="mt-1 truncate text-xs text-[#7c7979]">{product.description}</p><div className="mt-5 flex items-center justify-between"><strong className="text-sm text-[#010408]">{formatPrice(product.price)}</strong><span aria-label={`View ${product.name}`} className="grid size-10 place-items-center rounded-full bg-[#3051a0] text-white transition group-hover:bg-[#005dbd]"><ShoppingCart size={18} /></span></div></div></Link></article>;
}
