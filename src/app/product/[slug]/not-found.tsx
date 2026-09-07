import Link from "next/link";
export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="mt-3 text-[#334f6d]">
          This product may have been removed or is no longer available.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-[#005dbd] px-6 py-3 font-semibold text-white"
        >
          Browse products
        </Link>
      </div>
    </main>
  );
}
