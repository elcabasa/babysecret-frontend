import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { featuredProducts, formatPrice } from "@/data/products";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = featuredProducts.find((item) => item.id === slug) ?? featuredProducts[0]; return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-2"><div className="relative min-h-[500px] overflow-hidden rounded-2xl bg-white"><Image src={product.image} alt={product.name} fill className="object-cover" unoptimized /></div><div className="self-center"><p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">{product.category}</p><h1 className="mt-4 text-5xl font-medium">{product.name}</h1><p className="mt-5 text-2xl font-semibold">{formatPrice(product.price)}</p><p className="mt-6 leading-7 text-[#334f6d]">{product.description}</p><div className="mt-8 inline-block"><AddToCartButton product={product} /></div><Link href="/shop" className="ml-4 text-sm font-semibold text-[#3051a0]">Back to shop</Link></div></div></main>; }
