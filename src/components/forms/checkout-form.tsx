"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCartStore } from "@/store/cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import type { CheckoutCustomer } from "@/types/order";
import type { DeliveryQuote } from "@/types/shipping";
import { formatPrice } from "@/data/products";

type Location = { state: string; cities: string[] };

const schema = z.object({ firstName: z.string().min(2, "Enter your first name"), lastName: z.string().min(2, "Enter your last name"), email: z.string().email("Enter a valid email"), phone: z.string().min(7, "Enter a valid phone number"), country: z.string().min(2, "Enter your country"), state: z.string().min(2, "Enter your state"), city: z.string().min(2, "Enter your city"), address: z.string().min(5, "Enter your delivery address"), apartment: z.string().optional(), notes: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function CheckoutForm() {
  const router = useRouter();

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const quotes = useDeliveryStore((state) => state.quotes);
  const selectedRateId = useDeliveryStore((state) => state.selectedRateId);
  const status = useDeliveryStore((state) => state.status);
  const deliveryError = useDeliveryStore((state) => state.error);
  const setQuotes = useDeliveryStore((state) => state.setQuotes);
  const setStatus = useDeliveryStore((state) => state.setStatus);
  const setError = useDeliveryStore((state) => state.setError);
  const selectRate = useDeliveryStore((state) => state.selectRate);
  const resetDelivery = useDeliveryStore((state) => state.reset);

  const [submitError, setSubmitError] = useState("");
  const [cartIssues, setCartIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "Nigeria",
    },
  });

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data: { states?: Location[] }) =>
        setLocations(data.states ?? [])
      )
      .catch(() => {
        // keep the free-text fields if locations cannot load
      });
  }, []);

  const watched = useWatch({ control });

  const addressComplete = useMemo(
    () =>
      Boolean(
        watched.firstName?.trim() &&
          watched.lastName?.trim() &&
          watched.email?.trim() &&
          watched.phone?.trim() &&
          watched.country?.trim() &&
          watched.state?.trim() &&
          watched.city?.trim() &&
          watched.address?.trim()
      ),
    [watched]
  );

  const isNigeria =
    locations.length > 0 &&
    watched.country?.trim().toLowerCase() === "nigeria";

  const stateOptions = useMemo(
    () => locations.map((location) => location.state),
    [locations]
  );

  const cityOptions = useMemo(
    () =>
      locations.find((location) => location.state === watched.state)
        ?.cities ?? [],
    [locations, watched.state]
  );

  useEffect(() => {
    if (!addressComplete) {
      resetDelivery();
      return;
    }

    if (!items.length) return;

    const timer = setTimeout(async () => {
      setStatus("loading");

      try {
        const response = await fetch("/api/shipping/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: watched.firstName,
            lastName: watched.lastName,
            email: watched.email,
            phone: watched.phone,
            country: watched.country,
            state: watched.state,
            city: watched.city,
            address: watched.address,
            apartment: watched.apartment,
            items: items.map((item) => ({
              id: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          }),
        });

        const result = (await response.json()) as {
          success?: boolean;
          quotes?: DeliveryQuote[];
          message?: string;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Could not estimate delivery.");
        }

        setQuotes(result.quotes ?? []);
      } catch (quoteError) {
        setError(
          quoteError instanceof Error
            ? quoteError.message
            : "Could not estimate delivery."
        );
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [addressComplete, items, watched, setQuotes, setStatus, setError, resetDelivery]);

  const onSubmit = async (customer: CheckoutCustomer) => {
    if (!items.length) {
      setSubmitError("Your cart is empty.");
      return;
    }

    if (status !== "ready" || !selectedRateId) {
      setSubmitError("Please choose a delivery method before continuing.");
      return;
    }

    const selectedQuote = quotes.find((quote) => quote.rateId === selectedRateId);

    setSubmitError("");
    setCartIssues([]);
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          items,
          delivery: selectedQuote
            ? {
                rateId: selectedQuote.rateId,
                carrier: selectedQuote.carrierName,
                service: selectedQuote.service,
                amount: selectedQuote.amount,
              }
            : null,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        orderId?: number;
        reference?: string;
        authorizationUrl?: string;
        message?: string;
        unavailableItems?: {
          name: string;
        }[];
        priceChanges?: {
          before: {
            name: string;
            price: number;
          };
          after: {
            price: number;
          };
        }[];
      };

      if (!response.ok || !result.success) {
        setCartIssues([
          ...(result.unavailableItems ?? []).map(
            (item) => `${item.name} is no longer available.`
          ),
          ...(result.priceChanges ?? []).map(
            (change) =>
              `${change.before.name} changed from ${change.before.price} to ${change.after.price}.`
          ),
        ]);

        throw new Error(
          result.message ?? "Checkout could not be completed."
        );
      }

      // Redirect the customer to Paystack
      if (result.authorizationUrl) {
        window.location.replace(result.authorizationUrl);
        return;
      }

      // Fallback for already-completed payments
      if (result.reference) {
        clearCart();

        router.push(
          `/order-confirmation?reference=${encodeURIComponent(
            result.reference
          )}`
        );

        return;
      }

      throw new Error("Could not initialize payment.");
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "Checkout could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    name: keyof FormValues,
    label: string,
    type = "text",
    wide = false
  ) => (
    <label
      className={`grid gap-2 text-sm ${
        wide ? "sm:col-span-2" : ""
      }`}
      htmlFor={name}
    >
      {label}

      <input
        id={name}
        type={type}
        {...register(name)}
        aria-invalid={Boolean(errors[name])}
        className="glass-control rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
      />

      {errors[name] && (
        <span
          className="text-xs text-red-700"
          role="alert"
        >
          {errors[name]?.message}
        </span>
      )}
    </label>
  );

  const selectField = (
    name: keyof FormValues,
    label: string,
    options: string[],
    onChange: (value: string) => void,
    placeholder = `Select ${label.toLowerCase()}`,
    wide = false,
    resetKey?: string
  ) => (
    <label
      className={`grid gap-2 text-sm ${
        wide ? "sm:col-span-2" : ""
      }`}
      htmlFor={name}
    >
      {label}

      <select
        id={name}
        key={resetKey}
        defaultValue=""
        onChange={(event) => {
          setValue(name, event.target.value, { shouldValidate: true });
          onChange(event.target.value);
        }}
        aria-invalid={Boolean(errors[name])}
        className="glass-control rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {errors[name] && (
        <span
          className="text-xs text-red-700"
          role="alert"
        >
          {errors[name]?.message}
        </span>
      )}
    </label>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-panel grid gap-5 rounded-2xl p-6 sm:grid-cols-2 sm:p-8"
    >
      {field("firstName", "First name")}

      {field("lastName", "Last name")}

      {field("email", "Email", "email", true)}

      {field("phone", "Phone number", "tel", true)}

      {field("country", "Country")}

      {isNigeria
        ? selectField("state", "State", stateOptions, (value) => {
            if (value !== watched.state) {
              setValue("city", "", { shouldValidate: true });
            }
          })
        : field("state", "State")}

      {isNigeria
        ? selectField("city", "City", cityOptions, () => undefined, undefined, false, watched.state)
        : field("city", "City")}

      {field("address", "Street address", "text", true)}

      {field(
        "apartment",
        "Apartment, landmark (optional)",
        "text",
        true
      )}

      <div className="sm:col-span-2">
        <h3 className="text-sm font-semibold">Delivery method</h3>

        {status === "loading" && (
          <p className="mt-2 text-sm text-[#334f6d]">
            Estimating delivery rates for your address…
          </p>
        )}

        {status === "unavailable" && (
          <p className="mt-2 text-sm text-red-700">
            No delivery rate is available for this address.
          </p>
        )}

        {(status === "error") && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {deliveryError || "Could not estimate delivery. Please review your address."}
          </p>
        )}

        {status === "ready" && quotes.length > 0 && (
          <div className="mt-3 grid gap-3">
            {quotes.map((quote) => (
              <label
                key={quote.rateId}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
                  selectedRateId === quote.rateId
                    ? "border-[#005dbd] bg-[#e7effc]"
                    : "border-[#e5e3e3] bg-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={selectedRateId === quote.rateId}
                    onChange={() => selectRate(quote.rateId)}
                  />
                  <span>
                    <span className="block font-semibold">
                      {quote.carrierName}
                    </span>
                    <span className="block text-[#334f6d]">
                      {quote.service}
                      {quote.deliveryTime ? ` · ${quote.deliveryTime}` : ""}
                    </span>
                  </span>
                </span>
                <strong>{formatPrice(quote.amount)}</strong>
              </label>
            ))}
          </div>
        )}

        {status === "idle" && (
          <p className="mt-2 text-sm text-[#334f6d]">
            Delivery is calculated from your address and cart contents.
          </p>
        )}
      </div>

      <label
        className="grid gap-2 text-sm sm:col-span-2"
        htmlFor="notes"
      >
        Delivery notes (optional)

        <textarea
          id="notes"
          {...register("notes")}
          className="glass-control min-h-24 rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
        />
      </label>

      {cartIssues.length > 0 && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2"
          role="alert"
        >
          <p className="font-semibold">
            Review your cart before continuing
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            {cartIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>

          <p className="mt-2">
            Return to the cart to remove unavailable items or review
            updated prices.
          </p>
        </div>
      )}

      {submitError && (
        <p
          className="text-sm text-red-700 sm:col-span-2"
          role="alert"
        >
          {submitError}
        </p>
      )}

      <button
        disabled={submitting || !items.length}
        className="rounded-full bg-[#005dbd] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
      >
        {submitting
          ? "Redirecting to payment…"
          : "Continue to payment"}
      </button>

      <p className="text-xs text-[#334f6d] sm:col-span-2">
        You will be redirected to Paystack to complete your payment securely.
      </p>
    </form>
  );
}