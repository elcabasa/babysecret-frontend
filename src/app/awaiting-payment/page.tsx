"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import {
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";
import { formatPrice } from "@/data/products";
import { useCartStore } from "@/store/cart.store";
import { getBankDetails } from "@/config/bank";

type Step = "details" | "form" | "submitted";

type SearchParams = {
  reference?: string;
  amount?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

function CopyButton({
  value,
  label,
  copiedField,
  fieldKey,
  onCopy,
}: {
  value: string;
  label: string;
  copiedField: string | null;
  fieldKey: string;
  onCopy: (fieldKey: string, value: string) => void;
}) {
  const copied = copiedField === fieldKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(fieldKey, value)}
      className="glass-control shrink-0 rounded-lg p-2 transition hover:bg-white/80"
      aria-label={label}
      title={label}
    >
      {copied ? (
        <CheckCircle size={18} className="text-[#0055B8]" />
      ) : (
        <Copy size={18} className="text-[#424753]" />
      )}
    </button>
  );
}

export default function AwaitingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [payerName, setPayerName] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    payerName?: string;
    transferReference?: string;
  }>({});
  const [params, setParams] = useState<SearchParams | null>(null);

  const items = useCartStore((state) => state.items);
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  useEffect(() => {
    if (!copiedField) return;
    const timer = setTimeout(() => setCopiedField(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedField]);

  if (!params) return null;

  async function copyText(fieldKey: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers / non-secure contexts without clipboard API.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedField(fieldKey);
  }

  function handleShowForm() {
    setSubmitError("");
    setFieldErrors({});
    setStep("form");
  }

  async function handleSubmitConfirmation(event: React.FormEvent) {
    event.preventDefault();
    const reference = params?.reference;

    if (!reference) {
      setSubmitError("Invalid order reference.");
      return;
    }

    const errors: { payerName?: string; transferReference?: string } = {};
    if (payerName.trim().length < 2) {
      errors.payerName = "Enter the name used for the transfer.";
    }
    if (transferReference.trim().length < 3) {
      errors.transferReference = "Enter your transfer reference.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // Submits the payer's claim for manual verification. The order stays
      // pending (on-hold) — it is NOT marked as paid from the frontend.
      const response = await fetch("/api/payment/bank-transfer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          payerName: payerName.trim(),
          transferReference: transferReference.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not submit confirmation.");
      }

      setStep("submitted");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not submit confirmation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Server-provided details (via checkout) take precedence over environment
  // configuration. There are no hardcoded fallbacks: if neither source has
  // the details, fail clearly instead of showing placeholder values.
  let configError: string | null = null;
  let configured = { bankName: "", accountName: "", accountNumber: "" };
  try {
    configured = getBankDetails();
  } catch (error) {
    configError =
      error instanceof Error
        ? error.message
        : "Bank transfer is not configured.";
  }

  const bankName = params.bankName || configured.bankName;
  const accountName = params.accountName || configured.accountName;
  const accountNumber = params.accountNumber || configured.accountNumber;
  const bankDetailsAvailable = Boolean(bankName && accountName && accountNumber);
  const reference = params.reference || "";
  const parsedAmount = params.amount ? Number(params.amount) : NaN;
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : subtotal;
  const hasItemBreakdown = items.length > 0;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-16 sm:px-10 md:pt-36">
      <Header />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
          Bank Transfer Payment
        </p>
        <h1 className="mt-4 text-4xl font-medium">Complete Your Order</h1>

        <div className="glass-panel mt-8 rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3 text-[#0055B8]">
            <AlertCircle size={24} className="shrink-0" />
            <div>
              <p className="font-semibold text-[#142F54]">
                Payment Awaiting Confirmation
              </p>
              <p className="text-sm text-[#424753]">
                Your order has been received. Please complete the bank transfer
                to proceed.
              </p>
            </div>
          </div>

          {/* Prominent order total */}
          <section
            aria-label="Order total"
            className="rounded-xl bg-[#0055B8] px-5 py-6 text-center text-white"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              Amount to transfer
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {formatPrice(amount)}
            </p>
            <p className="mt-2 text-xs text-white/80">
              Transfer exactly this amount so we can match your payment.
            </p>
          </section>

          <div className="mt-6 space-y-6">
            {/* Bank Details */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#142F54]">
                <Building2 size={20} className="text-[#0055B8]" />
                Bank Transfer Details
              </h2>
              {bankDetailsAvailable ? (
              <div className="space-y-4 rounded-xl bg-[#F4F8FC] p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-[#424753]">Bank Name</span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-semibold text-[#142F54]">
                      {bankName}
                    </span>
                    <CopyButton
                      value={bankName}
                      label="Copy bank name"
                      copiedField={copiedField}
                      fieldKey="bankName"
                      onCopy={copyText}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-[#424753]">Account Name</span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-semibold text-[#142F54]">
                      {accountName}
                    </span>
                    <CopyButton
                      value={accountName}
                      label="Copy account name"
                      copiedField={copiedField}
                      fieldKey="accountName"
                      onCopy={copyText}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-[#424753]">Account Number</span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-mono font-semibold tracking-wide text-[#142F54]">
                      {accountNumber}
                    </span>
                    <CopyButton
                      value={accountNumber}
                      label="Copy account number"
                      copiedField={copiedField}
                      fieldKey="accountNumber"
                      onCopy={copyText}
                    />
                  </div>
                </div>
                {copiedField && (
                  <p
                    className="text-xs font-medium text-[#0055B8]"
                    role="status"
                  >
                    Copied to clipboard.
                  </p>
                )}
              </div>
              ) : (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 p-5"
                  role="alert"
                >
                  <p className="font-semibold text-red-800">
                    Bank transfer details are not available.
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {configError ??
                      "The receiving account is not configured. Please contact support to complete your payment."}
                  </p>
                </div>
              )}
            </section>

            {/* Transfer Reference */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-[#142F54]">
                Transfer Reference
              </h2>
              <div className="rounded-xl bg-[#F4F8FC] p-5">
                <p className="mb-2 text-sm text-[#424753]">
                  Include this reference in your transfer description:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-lg font-semibold text-[#142F54]">
                    {reference || "—"}
                  </code>
                  {reference && (
                    <CopyButton
                      value={reference}
                      label="Copy transfer reference"
                      copiedField={copiedField}
                      fieldKey="reference"
                      onCopy={copyText}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-[#142F54]">
                Important Instructions
              </h2>
              <ul className="space-y-3 text-sm text-[#424753]">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#D8E2FF] text-xs font-bold text-[#0055B8]">
                    1
                  </span>
                  <span>
                    Transfer the <strong>exact amount</strong> shown above to
                    the account details.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#D8E2FF] text-xs font-bold text-[#0055B8]">
                    2
                  </span>
                  <span>
                    Include the <strong>Transfer Reference</strong> in the
                    transfer description/narration.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#D8E2FF] text-xs font-bold text-[#0055B8]">
                    3
                  </span>
                  <span>
                    Keep your transfer receipt/screenshot for verification.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#D8E2FF] text-xs font-bold text-[#0055B8]">
                    4
                  </span>
                  <span>
                    Click{" "}
                    <strong>
                      &ldquo;I Have Made The Transfer&rdquo;
                    </strong>{" "}
                    below once the transfer is complete, then submit your
                    transfer details.
                  </span>
                </li>
              </ul>
            </section>

            {/* Confirm transfer: button -> form -> submitted */}
            {step === "details" && bankDetailsAvailable && (
              <section>
                <button
                  type="button"
                  onClick={handleShowForm}
                  className="w-full rounded-full bg-[#0055B8] px-6 py-3 font-semibold text-white transition hover:bg-[#004a9f]"
                >
                  I Have Made The Transfer
                </button>
                <p className="mt-3 text-center text-xs text-[#737784]">
                  Your order stays pending until we verify your transfer. We
                  will process it after verification, usually within 1-2
                  business hours.
                </p>
              </section>
            )}

            {step === "form" && bankDetailsAvailable && (
              <section aria-label="Payment confirmation form">
                <form
                  onSubmit={handleSubmitConfirmation}
                  className="rounded-xl border border-[#D8E2FF] bg-white p-5"
                >
                  <h2 className="text-lg font-semibold text-[#142F54]">
                    Confirm Your Transfer
                  </h2>
                  <p className="mt-1 text-sm text-[#424753]">
                    Tell us who sent the transfer and its reference so we can
                    verify it. Your order remains{" "}
                    <strong>pending</strong> until verification is complete.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <label
                      className="grid gap-2 text-sm"
                      htmlFor="payerName"
                    >
                      <span className="font-semibold text-[#142F54]">
                        Transfer / payer name
                      </span>
                      <input
                        id="payerName"
                        type="text"
                        value={payerName}
                        onChange={(event) => setPayerName(event.target.value)}
                        placeholder="e.g. Adaeze Okafor"
                        autoComplete="name"
                        className="glass-control rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
                      />
                      {fieldErrors.payerName && (
                        <span className="text-xs text-red-700" role="alert">
                          {fieldErrors.payerName}
                        </span>
                      )}
                    </label>

                    <label
                      className="grid gap-2 text-sm"
                      htmlFor="transferReference"
                    >
                      <span className="font-semibold text-[#142F54]">
                        Transfer reference
                      </span>
                      <input
                        id="transferReference"
                        type="text"
                        value={transferReference}
                        onChange={(event) =>
                          setTransferReference(event.target.value)
                        }
                        placeholder="Bank narration / session ID"
                        className="glass-control rounded-xl px-4 py-3 font-mono outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
                      />
                      {fieldErrors.transferReference && (
                        <span className="text-xs text-red-700" role="alert">
                          {fieldErrors.transferReference}
                        </span>
                      )}
                      <span className="text-xs text-[#737784]">
                        Use the sender name and narration exactly as they
                        appear on your transfer receipt.
                      </span>
                    </label>
                  </div>

                  {submitError && (
                    <p
                      className="mt-4 text-sm text-red-700"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      disabled={submitting}
                      className="rounded-full border border-[#e5e3e3] bg-white px-6 py-3 font-semibold text-[#142F54] transition hover:bg-[#F4F8FC] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 rounded-full bg-[#0055B8] px-6 py-3 font-semibold text-white transition hover:bg-[#004a9f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={18}
                            className="mr-2 inline-block animate-spin"
                          />
                          Submitting…
                        </>
                      ) : (
                        "Submit Payment Confirmation"
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-[#737784]">
                    Submitting does not mark your order as paid — it queues it
                    for manual verification.
                  </p>
                </form>
              </section>
            )}

            {step === "submitted" && (
              <section>
                <div className="flex items-center justify-center gap-3 text-[#0055B8]">
                  <CheckCircle size={24} />
                  <span className="font-semibold">
                    Transfer confirmation submitted!
                  </span>
                </div>
                <p className="mt-3 text-center text-sm text-[#424753]">
                  Your order is now awaiting payment verification. We will
                  confirm your payment and begin processing your order
                  shortly — your order will only be processed after the bank
                  transfer is verified.
                </p>
                <p className="mt-2 text-center text-xs text-[#737784]">
                  You will receive an email once your payment is verified.
                </p>
                <Link
                  href="/shop"
                  className="mt-6 inline-block w-full rounded-full bg-[#0055B8] px-7 py-3 text-center font-semibold text-white"
                >
                  Continue Shopping
                </Link>
              </section>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <h2 className="font-semibold">Order Summary</h2>
          {hasItemBreakdown ? (
            <>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId ?? "default"}`}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-[#e5e3e3] pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#424753]">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#424753]">Delivery</span>
                  <span className="font-semibold">
                    {formatPrice(Math.max(amount - subtotal, 0))}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#424753]">
              Your order has been placed and your cart cleared.
            </p>
          )}
          <div className="mt-4 flex justify-between border-t border-[#e5e3e3] pt-4 text-lg">
            <strong>Total</strong>
            <strong>{formatPrice(amount)}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}
