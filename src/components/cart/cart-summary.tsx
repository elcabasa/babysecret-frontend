import Link from "next/link";
import { formatPrice } from "@/data/products";
export function CartSummary({
  subtotal,
  checkout = true,
}: {
  subtotal: number;
  checkout?: boolean;
}) {
  return (
    <aside className="glass-panel min-w-0 rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <div className="mt-6 flex justify-between text-sm">
        <span>Subtotal</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>
      <div className="mt-4 flex justify-between text-sm text-[#334f6d]">
        <span>Delivery</span>
        <span>Calculated at checkout</span>
      </div>
      <div className="mt-6 flex justify-between border-t border-[#e5e3e3] pt-5 text-lg">
        <strong>Total</strong>
        <strong>{formatPrice(subtotal)}</strong>
      </div>
      {checkout && (
        <Link
          href="/checkout"
          className="mt-6 block rounded-full bg-[#005dbd] px-6 py-3 text-center font-semibold text-white transition hover:bg-[#004a97] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2"
        >
          Proceed to Checkout
        </Link>
      )}
      <Link
        href="/shop"
        className="mt-4 block rounded-full text-center text-sm font-semibold text-[#3051a0] transition hover:underline focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2"
      >
        Continue Shopping
      </Link>
    </aside>
  );
}
