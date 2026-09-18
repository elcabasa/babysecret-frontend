"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useCartStore } from "@/store/cart.store";

export default function AwaitingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    amount?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  }>;
}) {
  const [copied, setCopied] = useState(false);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [params, setParams] = useState<{
    reference?: string;
    amount?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  } | null>(null);

  const items = useCartStore((state) => state.items);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  if (!params) return null;

  async function handleConfirmTransfer() {
    if (!params) return;
    const reference = params.reference;

    if (!reference) {
      setConfirmError("Invalid order reference.");
      return;
    }

    setConfirming(true);
    setConfirmError("");

    try {
      const response = await fetch("/api/payment/bank-transfer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not confirm transfer.");
      }

      setTransferConfirmed(true);
    } catch (error) {
      setConfirmError(
        error instanceof Error
          ? error.message
          : "Could not confirm transfer. Please try again.",
      );
    } finally {
      setConfirming(false);
    }
  }

  function copyAccountNumber(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const bankName = params.bankName || "Moniepoint Microfinance Bank";
  const accountName = params.accountName || "Baby Secret";
  const accountNumber = params.accountNumber || "1234567890";
  const reference = params.reference || "";
  const amount = params.amount ? Number(params.amount) : subtotal;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-16 md:pt-36 sm:px-10">
      <Header />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
          Bank Transfer Payment
        </p>
        <h1 className="mt-4 text-4xl font-medium">Complete Your Order</h1>

        <div className="mt-8 glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 text-[#0055B8] mb-6">
            <AlertCircle size={24} />
            <div>
              <p className="font-semibold text-[#142F54]">Payment Awaiting Confirmation</p>
              <p className="text-sm text-[#424753]">
                Your order has been received. Please complete the bank transfer to proceed.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Bank Details */}
            <section>
              <h2 className="text-lg font-semibold text-[#142F54] mb-4">Moniepoint Bank Details</h2>
              <div className="bg-[#F4F8FC] rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#424753]">Bank Name</span>
                  <span className="font-semibold text-[#142F54]">{bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#424753]">Account Name</span>
                  <span className="font-semibold text-[#142F54]">{accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#424753]">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[#142F54]">{accountNumber}</span>
                    <button
                      onClick={() => copyAccountNumber(accountNumber)}
                      className="glass-control p-2 rounded-lg hover:bg-white/80 transition"
                      aria-label="Copy account number"
                    >
                      {copied ? (
                        <CheckCircle size={18} className="text-[#0055B8]" />
                      ) : (
                        <Copy size={18} className="text-[#424753]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-[#D8E2FF] pt-4">
                  <span className="text-sm text-[#424753]">Amount to Transfer</span>
                  <span className="text-xl font-bold text-[#0055B8]">{formatPrice(amount)}</span>
                </div>
              </div>
            </section>

            {/* Transfer Reference */}
            <section>
              <h2 className="text-lg font-semibold text-[#142F54] mb-4">Transfer Reference</h2>
              <div className="bg-[#F4F8FC] rounded-xl p-5">
                <p className="text-sm text-[#424753] mb-2">
                  Include this reference in your transfer description:
                </p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-lg font-semibold text-[#142F54] flex-1 break-all">
                    {reference}
                  </code>
                  <button
                    onClick={() => copyAccountNumber(reference)}
                    className="glass-control p-2 rounded-lg hover:bg-white/80 transition"
                    aria-label="Copy reference"
                  >
                    {copied ? (
                      <CheckCircle size={18} className="text-[#0055B8]" />
                    ) : (
                      <Copy size={18} className="text-[#424753]" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="text-lg font-semibold text-[#142F54] mb-4">Important Instructions</h2>
              <ul className="space-y-3 text-sm text-[#424753]">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D8E2FF] flex items-center justify-center text-[#0055B8] text-xs font-bold">
                    1
                  </span>
                  <span>
                    Transfer the <strong>exact amount</strong> shown above to the Moniepoint account details.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D8E2FF] flex items-center justify-center text-[#0055B8] text-xs font-bold">
                    2
                  </span>
                  <span>
                    Include the <strong>Transfer Reference</strong> in the transfer description/narration.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D8E2FF] flex items-center justify-center text-[#0055B8] text-xs font-bold">
                    3
                  </span>
                  <span>
                    Keep your transfer receipt/screenshot for verification.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D8E2FF] flex items-center justify-center text-[#0055B8] text-xs font-bold">
                    4
                  </span>
                  <span>
                    Click <strong>&ldquo;I&apos;ve Made the Transfer&rdquo;</strong> below once the transfer is complete.
                  </span>
                </li>
              </ul>
            </section>

            {/* Confirm Transfer Button */}
            {!transferConfirmed ? (
              <section>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={confirming}
                  className="w-full rounded-full bg-[#0055B8] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 transition hover:bg-[#004a9f]"
                >
                  {confirming ? (
                    <>
                      <Loader2 size={18} className="inline-block animate-spin mr-2" />
                      Confirming…
                    </>
                  ) : (
                    "I've Made the Transfer"
                  )}
                </button>
                {confirmError && (
                  <p className="mt-3 text-sm text-red-700 text-center" role="alert">
                    {confirmError}
                  </p>
                )}
                <p className="mt-3 text-xs text-center text-[#737784]">
                  We will verify your payment manually and update your order status within 1-2 business
                  hours.
                </p>
              </section>
            ) : (
              <section>
                <div className="flex items-center justify-center gap-3 text-[#0055B8]">
                  <CheckCircle size={24} />
                  <span className="font-semibold">Transfer confirmation submitted!</span>
                </div>
                <p className="mt-3 text-sm text-center text-[#424753]">
                  Your order is now awaiting payment verification. We will confirm your payment and
                  begin processing your order shortly.
                </p>
                <p className="mt-2 text-xs text-center text-[#737784]">
                  You will receive an email once your payment is verified.
                </p>
                <Link
                  href="/shop"
                  className="mt-6 inline-block rounded-full bg-[#0055B8] px-7 py-3 font-semibold text-white text-center w-full"
                >
                  Continue Shopping
                </Link>
              </section>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-6 glass-panel rounded-2xl p-6">
          <h2 className="font-semibold">Order Summary</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? "default"}`}
                className="flex justify-between gap-4 text-sm"
              >
                <span>{item.name} × {item.quantity}</span>
                <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#e5e3e3] pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#424753]">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#424753]">Delivery</span>
              <span className="font-semibold">{formatPrice(amount - subtotal)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-[#e5e3e3] pt-4 text-lg">
            <strong>Total</strong>
            <strong>{formatPrice(amount)}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}