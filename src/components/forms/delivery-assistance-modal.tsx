"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormField } from "@/components/forms/form-field";

const assistanceFormSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name").max(100),
  lastName: z.string().trim().min(2, "Enter your last name").max(100),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  state: z.string().trim().min(2, "Enter your state").max(100),
  city: z.string().trim().min(2, "Enter your city").max(100),
  address: z.string().trim().min(5, "Enter your delivery address").max(200),
  apartment: z.string().trim().max(200).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

type AssistanceFormValues = z.input<typeof assistanceFormSchema>;

export interface DeliveryAssistanceCartItem {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
}

export interface DeliveryAssistanceInitialValues {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  state?: string;
  city?: string;
  address?: string;
  apartment?: string;
  country?: string;
}

const REQUEST_ID_KEY = "babysecret.deliveryAssistance.requestId.v1";
const SUBMISSION_KEY = "babysecret.deliveryAssistance.submission.v1";

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private browsing etc: the server still dedupes by request id + payload.
  }
}

function removeStorage(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore — storage is only a best-effort refresh guard.
  }
}

function storedRequestId(): string {
  const existing = readStorage(REQUEST_ID_KEY);

  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dlv-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  writeStorage(REQUEST_ID_KEY, created);

  return created;
}

/**
 * Delivery-assistance dialog.
 *
 * Every visible value comes from the checkout form state passed in via
 * `initialValues` — this component never reads store-origin, pickup-location,
 * or shipping-origin configuration, so store details cannot leak into the
 * customer's request.
 */
export function DeliveryAssistanceModal({
  open,
  initialValues,
  items,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  initialValues: DeliveryAssistanceInitialValues;
  items: DeliveryAssistanceCartItem[];
  onClose: () => void;
  onSubmitted?: (reference: string) => void;
}) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function requestBody(requestId: string, values: AssistanceFormValues): string {
    return JSON.stringify({
      requestId,
      firstName: values.firstName ?? "",
      lastName: values.lastName ?? "",
      email: values.email ?? "",
      phone: values.phone ?? "",
      state: values.state ?? "",
      city: values.city ?? "",
      address: values.address ?? "",
      apartment: values.apartment ?? "",
      note: values.note ?? "",
      items: items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        name: item.name,
        quantity: item.quantity,
      })),
    });
  }

  // Fingerprint of the checkout-sourced details (not the editable note): a
  // refresh with unchanged details restores the confirmation; changed
  // details start a genuinely new request.
  function requestFingerprint(): string {
    return JSON.stringify({
      firstName: initialValues.firstName ?? "",
      lastName: initialValues.lastName ?? "",
      email: initialValues.email ?? "",
      phone: initialValues.phone ?? "",
      state: initialValues.state ?? "",
      city: initialValues.city ?? "",
      address: initialValues.address ?? "",
      apartment: initialValues.apartment ?? "",
      items: items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        name: item.name,
        quantity: item.quantity,
      })),
    });
  }

  // One idempotency key per browser tab session: retries and refreshes reuse
  // it, so the server can recognize a repeated submission as the same request.
  // Lazy initializers (not effects) so no cascading renders occur.
  const [requestId, setRequestId] = useState<string>(() => storedRequestId());

  // If this tab already submitted these exact details, show the confirmation
  // instead of sending again after a refresh. Anything else starts fresh.
  const [reference, setReference] = useState<string | null>(() => {
    const raw = readStorage(SUBMISSION_KEY);

    if (!raw) return null;

    try {
      const stored = JSON.parse(raw) as {
        fingerprint?: string;
        reference?: string;
      };

      if (
        stored?.reference &&
        stored?.fingerprint === requestFingerprint()
      ) {
        return stored.reference;
      }
    } catch {
      // A corrupt entry must never block a fresh request.
      removeStorage(SUBMISSION_KEY);
    }

    return null;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceFormSchema),
    defaultValues: {
      firstName: initialValues.firstName ?? "",
      lastName: initialValues.lastName ?? "",
      email: initialValues.email ?? "",
      phone: initialValues.phone ?? "",
      state: initialValues.state ?? "",
      city: initialValues.city ?? "",
      address: initialValues.address ?? "",
      apartment: initialValues.apartment ?? "",
      note: "",
    },
  });

  // Dialog behavior: Escape closes, background scroll locks, and focus moves
  // to the title when the dialog opens.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(values: AssistanceFormValues) {
    if (!items.length) {
      setSubmitError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const body = requestBody(requestId, values);

    try {
      const response = await fetch("/api/shipping/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const result = (await response.json().catch(() => null)) as {
        success?: boolean;
        reference?: string;
        message?: string;
      } | null;

      if (!response.ok || !result?.success || !result.reference) {
        throw new Error(
          result?.message ?? "Could not send your request. Please try again.",
        );
      }

      writeStorage(
        SUBMISSION_KEY,
        JSON.stringify({
          fingerprint: requestFingerprint(),
          reference: result.reference,
        }),
      );

      setReference(result.reference);
      onSubmitted?.(result.reference);
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not send your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startNewRequest() {
    removeStorage(SUBMISSION_KEY);
    removeStorage(REQUEST_ID_KEY);
    setReference(null);
    setSubmitError("");
    reset({
      firstName: initialValues.firstName ?? "",
      lastName: initialValues.lastName ?? "",
      email: initialValues.email ?? "",
      phone: initialValues.phone ?? "",
      state: initialValues.state ?? "",
      city: initialValues.city ?? "",
      address: initialValues.address ?? "",
      apartment: initialValues.apartment ?? "",
      note: "",
    });
    setRequestId(storedRequestId());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e3e3] px-5 py-4 sm:px-6">
          <h2
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-[#142F54] outline-none"
          >
            Request Delivery Assistance
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close delivery assistance dialog"
            className="rounded-full border border-[#64748b] px-3 py-1 text-sm font-semibold text-[#334f6d] transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-1"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          {reference ? (
            <div role="status">
              <p className="text-base font-semibold text-[#14532d]">
                ✓ Request submitted
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#334f6d]">
                We&apos;ve received your delivery request. We&apos;ll contact
                you with the available delivery option and delivery cost.
              </p>
              <p className="mt-3 text-sm text-[#334f6d]">
                Request reference:
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#142F54]">
                {reference}
              </p>
              <button
                type="button"
                onClick={startNewRequest}
                className="mt-4 rounded-full border-2 border-[#005dbd] bg-white px-4 py-2 text-xs font-semibold text-[#005dbd] transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2"
              >
                Start a new request
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 sm:grid-cols-2"
            >
              <p className="text-sm leading-relaxed text-[#334f6d] sm:col-span-2">
                We couldn&apos;t find an automatic delivery option for this
                address. Submit your details and we&apos;ll contact you with
                the available delivery option and delivery cost.
              </p>

              <h3 className="text-sm font-semibold text-[#142F54] sm:col-span-2">
                Contact information
              </h3>

              <FormField
                name="firstName"
                label="First name"
                register={register}
                error={errors.firstName}
              />
              <FormField
                name="lastName"
                label="Last name"
                register={register}
                error={errors.lastName}
              />
              <FormField
                name="email"
                label="Email"
                type="email"
                register={register}
                error={errors.email}
              />
              <FormField
                name="phone"
                label="Phone number"
                type="tel"
                register={register}
                error={errors.phone}
              />

              <h3 className="text-sm font-semibold text-[#142F54] sm:col-span-2">
                Delivery destination
              </h3>

              <FormField
                name="state"
                label="State"
                register={register}
                error={errors.state}
              />
              <FormField
                name="city"
                label="City"
                register={register}
                error={errors.city}
              />
              <FormField
                name="address"
                label="Delivery address"
                wide
                register={register}
                error={errors.address}
              />
              <FormField
                name="apartment"
                label="Apartment / Landmark (optional)"
                wide
                register={register}
                error={errors.apartment}
              />

              <label
                className="grid gap-2 text-sm sm:col-span-2"
                htmlFor="assistance-note"
              >
                Additional note (optional)
                <textarea
                  id="assistance-note"
                  {...register("note")}
                  className="glass-control min-h-24 w-full rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
                />
                {errors.note && (
                  <span className="text-xs text-red-700" role="alert">
                    {errors.note.message}
                  </span>
                )}
              </label>

              <p className="text-xs text-[#334f6d] sm:col-span-2">
                For the {items.length} item{items.length === 1 ? "" : "s"}{" "}
                currently in your cart. This sends a help request only — it
                does not place an order or charge a delivery fee.
              </p>

              {submitError && (
                <p className="text-sm text-red-700 sm:col-span-2" role="alert">
                  {submitError}
                </p>
              )}
            </form>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-[#e5e3e3] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {reference ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#005dbd] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#004a97] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2 active:bg-[#004a97]"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#64748b] px-6 py-2 text-sm font-semibold text-[#334f6d] transition hover:bg-[#e7effc] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="rounded-full bg-[#005dbd] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#004a97] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2 active:bg-[#004a97] disabled:cursor-not-allowed disabled:bg-[#dbe7f3] disabled:text-[#334f6d] disabled:hover:bg-[#dbe7f3]"
              >
                {submitting ? "Sending…" : "Request Delivery Assistance"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
