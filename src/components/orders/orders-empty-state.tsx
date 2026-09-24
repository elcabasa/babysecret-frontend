import Link from "next/link";
import { Package } from "lucide-react";

export function OrdersEmptyState() {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center">
      <Package className="mx-auto text-[#3051a0]" size={36} />
      <h2 className="mt-4 text-xl font-semibold text-[#102a43]">
        You haven&apos;t placed any orders yet.
      </h2>
      <p className="mt-2 text-[#334f6d]">
        Explore our baby care range and your order history will appear here.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white transition hover:bg-[#004d9c]"
      >
        Shop Now
      </Link>
    </div>
  );
}
