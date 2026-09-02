import Link from "next/link";

export function OrdersErrorState({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center">
      <p className="text-[#334f6d]">{message}</p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white transition hover:bg-[#004d9c]"
      >
        Continue Shopping
      </Link>
    </div>
  );
}