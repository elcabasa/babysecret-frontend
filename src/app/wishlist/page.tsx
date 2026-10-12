import Link from "next/link";
import { Header } from "@/components/layout/header";
import { WishlistPageContent } from "@/components/product/wishlist-page-content";
export default function WishlistPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">
          Saved for later
        </p>
        <h1 className="mt-4 text-5xl font-medium">Wishlist</h1>
        <WishlistPageContent />
        <Link
          href="/shop"
          className="mt-8 inline-block text-sm font-semibold text-[#3051a0]"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
