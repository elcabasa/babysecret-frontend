import Link from "next/link";
import { Header } from "@/components/layout/header";
import { CartClearer } from "@/components/cart/cart-clearer";
import { CheckCircle, AlertCircle } from "lucide-react";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    payment?: "failed" | "verification-failed";
    method?: string;
  }>;
}) {
  const { reference, payment, method } = await searchParams;
  const isBankTransfer = method === "bank_transfer";

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-16 md:pt-36 sm:px-10">
      <Header />

      <CartClearer />

      <div className="mx-auto max-w-2xl text-center">
        <div className="glass-panel rounded-2xl p-10">
          {payment === "failed" ? (
            <>
              <div className="flex items-center justify-center gap-3 text-red-700">
                <AlertCircle size={28} />
                <p className="text-xs font-semibold uppercase tracking-wide">Payment failed</p>
              </div>
              <h1 className="mt-4 text-4xl font-medium">Payment could not be completed</h1>
              <p className="mt-4 text-[#334f6d]">
                Something went wrong with your payment. Please try again or contact support if the
                issue persists.
              </p>
              <Link
                href="/checkout"
                className="mt-8 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
              >
                Try again
              </Link>
            </>
          ) : payment === "verification-failed" ? (
            <>
              <div className="flex items-center justify-center gap-3 text-amber-700">
                <AlertCircle size={28} />
                <p className="text-xs font-semibold uppercase tracking-wide">Verification pending</p>
              </div>
              <h1 className="mt-4 text-4xl font-medium">We couldn&apos;t verify your payment</h1>
              <p className="mt-4 text-[#334f6d]">
                Your payment may still be processing. Please check your email for updates or
                contact support.
              </p>
              <Link
                href="/shop"
                className="mt-8 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
              >
                Continue shopping
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 text-[#0055B8]">
                <CheckCircle size={28} />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {isBankTransfer ? "Order received" : "Payment successful"}
                </p>
              </div>

              <h1 className="mt-4 text-4xl font-medium">Thank you for your order!</h1>

              <p className="mt-4 text-[#334f6d]">
                {isBankTransfer
                  ? "Your order has been received and is awaiting payment verification. We will confirm your bank transfer and begin processing your order shortly."
                  : "Your payment has been received and your order is being processed. We will begin preparing your order shortly."}
              </p>

              {reference && (
                <div className="mt-6 rounded-xl bg-white p-4 text-sm">
                  <p className="text-[#334f6d]">Payment reference</p>

                  <p className="mt-2 font-semibold text-[#102a43]">{reference}</p>
                </div>
              )}

              <Link
                href="/shop"
                className="mt-8 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white"
              >
                Continue shopping
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
