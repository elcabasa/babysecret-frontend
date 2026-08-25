import Link from "next/link";
import { Header } from "@/components/layout/header";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
  }>;
}) {
  const { reference } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-2xl text-center">
        <div className="glass-panel rounded-2xl p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
            Payment successful
          </p>

          <h1 className="mt-4 text-4xl font-medium">
            Thank you for your order!
          </h1>

          <p className="mt-4 text-[#334f6d]">
            Your payment has been received and your order is being processed.
            We will begin preparing your order shortly.
          </p>

          {reference && (
            <div className="mt-6 rounded-xl bg-white p-4 text-sm">
              <p className="text-[#334f6d]">
                Payment reference
              </p>

              <p className="mt-2 font-semibold text-[#102a43]">
                {reference}
              </p>
            </div>
          )}

          <Link
            href="/shop"
            className="mt-8 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}