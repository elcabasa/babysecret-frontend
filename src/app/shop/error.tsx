"use client";
import Link from "next/link";
export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">
          We couldn&apos;t load products
        </h1>
        <p className="mt-3 text-[#334f6d]">
          Please try again or return to the homepage.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-[#005dbd] px-6 py-3 font-semibold text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-[#3051a0] px-6 py-3 font-semibold text-[#3051a0]"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
