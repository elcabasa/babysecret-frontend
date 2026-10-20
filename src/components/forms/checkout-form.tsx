"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCartStore } from "@/store/cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useFulfillmentStore } from "@/store/fulfillment.store";
import type { CheckoutCustomer, FulfillmentMethod } from "@/types/order";
import type { DeliveryQuote } from "@/types/shipping";
import type { PickupLocationSummary } from "@/config/pickup";
import { CartIssuesAlert } from "@/components/forms/cart-issues-alert";
import { DeliveryAssistanceModal } from "@/components/forms/delivery-assistance-modal";
import { DeliveryMethods } from "@/components/forms/delivery-methods";
import { FulfillmentMethodSelector } from "@/components/forms/fulfillment-method-selector";
import { PickupLocations } from "@/components/forms/pickup-locations";
import { FormField } from "@/components/forms/form-field";
import { FormSelectField } from "@/components/forms/form-select-field";
import { CreditCard, Building2 } from "lucide-react";

type Location = { state: string; cities: string[] };

type PaymentMethod = "paystack" | "flutterwave" | "bank_transfer";

/*
 * Payment methods supported by the integration. Paystack and Flutterwave
 * remain fully implemented (see payment.service.ts + /api/checkout) and
 * can be re-enabled by adding them to ENABLED_PAYMENT_METHODS.
 * For now only Bank Transfer is visible to customers.
 */
const PAYMENT_METHOD_OPTIONS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  icon: "card" | "bank";
}[] = [
  { id: "paystack", label: "Paystack", hint: "Pay with card or bank", icon: "card" },
  {
    id: "flutterwave",
    label: "Flutterwave",
    hint: "Pay with card, bank, or USSD",
    icon: "card",
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    hint: "Manual transfer — we'll verify manually",
    icon: "bank",
  },
];

const ENABLED_PAYMENT_METHODS: PaymentMethod[] = ["bank_transfer"];

const VISIBLE_PAYMENT_METHODS = PAYMENT_METHOD_OPTIONS.filter((option) =>
  ENABLED_PAYMENT_METHODS.includes(option.id),
);

/**
 * Address fields are only mandatory for delivery. Pickup orders never reach a
 * courier, so requiring a street address would block a customer who only wants
 * to collect in-store.
 */
function requireText(
  ctx: z.RefinementCtx,
  value: string | undefined,
  path: string,
  min: number,
  message: string,
) {
  if ((value ?? "").trim().length < min) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      type: "string",
      minimum: min,
      inclusive: true,
      path: [path],
      message,
    });
  }
}

const schema = z
  .object({
    firstName: z.string().min(2, "Enter your first name"),
    lastName: z.string().min(2, "Enter your last name"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    country: z.string().min(2, "Enter your country"),
    state: z.string().optional(),
    city: z.string().optional(),
    // LGA / Area is informational local-address data only. It is never sent
    // to Terminal as delivery_address.city — the Terminal-supported City /
    // Delivery Area above owns the quote.
    lga: z.string().optional(),
    address: z.string().optional(),
    apartment: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z
      .enum(["paystack", "flutterwave", "bank_transfer"])
      .optional(),
    fulfillmentMethod: z.enum(["delivery", "pickup"]).optional(),
    pickupLocationId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "pickup") {
      if (!data.pickupLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupLocationId"],
          message: "Please select a pickup location to continue.",
        });
      }

      return;
    }

    requireText(ctx, data.state, "state", 2, "Enter your state");
    requireText(ctx, data.city, "city", 2, "Enter your city");
    requireText(ctx, data.address, "address", 5, "Enter your delivery address");
    // Terminal validates and persists the destination postcode — it must come
    // from the customer, never invented.
  });

type FormValues = z.infer<typeof schema>;

export function CheckoutForm() {
  const router = useRouter();

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const quotes = useDeliveryStore((state) => state.quotes);
  const selectedRateId = useDeliveryStore((state) => state.selectedRateId);
  const status = useDeliveryStore((state) => state.status);

  const setQuotes = useDeliveryStore((state) => state.setQuotes);
  const setStatus = useDeliveryStore((state) => state.setStatus);
  const setError = useDeliveryStore((state) => state.setError);
  const resetDelivery = useDeliveryStore((state) => state.reset);

  const fulfillmentMethod = useFulfillmentStore((state) => state.method);
  const pickupLocationId = useFulfillmentStore(
    (state) => state.pickupLocationId,
  );
  const setPickupLocations = useFulfillmentStore(
    (state) => state.setPickupLocations,
  );

  const [submitError, setSubmitError] = useState("");
  const [cartIssues, setCartIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  // Canonical Terminal Africa cities for the selected Nigerian state. The
  // shipping City field offers ONLY these — never the LGA dataset — so the
  // quoted city is always Terminal-accepted.
  const [terminalCities, setTerminalCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [assistanceOpen, setAssistanceOpen] = useState(false);

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
      paymentMethod: "bank_transfer" as PaymentMethod,
      fulfillmentMethod: "delivery" as FulfillmentMethod,
    },
  });

  /*
   * Load Nigeria state/city data for the dropdowns.
   */
  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data: { states?: Location[] }) => setLocations(data.states ?? []))
      .catch(() => {
        // keep the free-text fields if locations cannot load
      });
  }, []);

  /*
   * Load pickup locations from the server (src/config/pickup.ts). No pickup
   * data is hardcoded in this component.
   */
  useEffect(() => {
    let active = true;

    fetch("/api/pickup-locations")
      .then((response) => response.json())
      .then((data: { locations?: PickupLocationSummary[] }) => {
        if (!active) return;
        setPickupLocations(data.locations ?? []);
      })
      .catch((error) => {
        if (!active) return;
        // Never surface provider internals; the picker shows a friendly state.
        console.error("Pickup locations error:", error);
      });

    return () => {
      active = false;
    };
  }, [setPickupLocations]);

  /*
   * Mirror the fulfillment store into the form so validation can make the
   * address fields conditional and `onSubmit` receives the selection.
   */
  useEffect(() => {
    setValue("fulfillmentMethod", fulfillmentMethod, { shouldValidate: true });
  }, [fulfillmentMethod, setValue]);

  useEffect(() => {
    setValue("pickupLocationId", pickupLocationId ?? "", {
      shouldValidate: true,
    });
  }, [pickupLocationId, setValue]);

  const watched = useWatch({ control });

  const isNigeria =
    locations.length > 0 && watched.country?.trim().toLowerCase() === "nigeria";

  /*
   * Primitive snapshots of the watched fields. `watched` itself is a fresh
   * object identity on every render, so it must NEVER appear in an effect
   * dependency array — these strings do that job instead.
   */
  const qFirstName = watched.firstName ?? "";
  const qLastName = watched.lastName ?? "";
  const qEmail = watched.email ?? "";
  const qPhone = watched.phone ?? "";
  const qCountry = watched.country ?? "";
  const qState = watched.state ?? "";
  const qCity = watched.city ?? "";
  const qLga = watched.lga ?? "";
  const qAddress = watched.address ?? "";
  const qApartment = watched.apartment ?? "";
  const qZip = watched.zip ?? "";

  // Assistance requests reuse the checkout contact/address fields and the
  // cart's product ids — never prices or weights. Memoized so the assistance
  // form only sees stable values.
  const assistanceInitialValues = useMemo(
    () => ({
      firstName: watched.firstName ?? "",
      lastName: watched.lastName ?? "",
      email: watched.email ?? "",
      phone: watched.phone ?? "",
      state: watched.state ?? "",
      city: watched.city ?? "",
      address: watched.address ?? "",
      apartment: watched.apartment ?? "",
      country: watched.country ?? "Nigeria",
    }),
    [
      watched.firstName,
      watched.lastName,
      watched.email,
      watched.phone,
      watched.state,
      watched.city,
      watched.address,
      watched.apartment,
      watched.country,
    ],
  );

  const assistanceItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        name: item.name,
        quantity: item.quantity,
      })),
    [items],
  );

  // The assistance form only makes sense while delivery is selected and no
  // automatic rate is available. Derived (not synced in an effect) so a
  // method switch or a fresh quote naturally hides it without extra renders.
  const showAssistance =
    assistanceOpen &&
    fulfillmentMethod === "delivery" &&
    (status === "unavailable" || status === "error");

  const addressComplete = useMemo(
    () =>
      Boolean(
        qFirstName.trim() &&
        qLastName.trim() &&
        qEmail.trim() &&
        qPhone.trim() &&
        qCountry.trim() &&
        qState.trim() &&
        qCity.trim() &&
        qAddress.trim() &&
      ),
    [
      qFirstName,
      qLastName,
      qEmail,
      qPhone,
      qCountry,
      qState,
      qCity,
      qAddress,
    ],
  );

  /*
   * Stable cart signature: a quantity/product change alters parcel
   * weight/items and must re-quote, but an unrelated render must not.
   * The raw `items` array reference is never a dependency.
   */
  const cartSignature = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.productId}:${item.variantId ?? ""}x${item.quantity}`,
        )
        .join("|"),
    [items],
  );

  /*
   * Canonical city for the signature: when the picked/typed city matches a
   * Terminal canonical city (case/punctuation-insensitive), the canonical
   * spelling owns the key. "ojo" typed and "Ojo" picked are the same
   * destination — one request, not two — and the key always carries the
   * value Terminal actually quotes.
   */
  const canonicalCity = useMemo(() => {
    const raw = qCity.trim();
    if (!raw || !isNigeria) return raw;
    const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      terminalCities.find(
        (city) => city.toLowerCase().replace(/[^a-z0-9]/g, "") === norm,
      ) ?? raw
    );
  }, [qCity, isNigeria, terminalCities]);

  /*
   * Stable quote-request key. The quote effect depends ONLY on this string
   * (plus fulfillment method and completeness): identical inputs → identical
   * key → no new request, no matter how often the component renders.
   */
  const quoteRequestKey = useMemo(() => {
    if (fulfillmentMethod !== "delivery" || !addressComplete) return "";
    return JSON.stringify([
      fulfillmentMethod,
      qCountry.trim(),
      qState.trim(),
      canonicalCity,
      qLga.trim(),
      qAddress.trim(),
      qApartment.trim(),
      qZip.trim(),
      qFirstName.trim(),
      qLastName.trim(),
      qEmail.trim(),
      qPhone.trim(),
      cartSignature,
    ]);
  }, [
    fulfillmentMethod,
    addressComplete,
    qCountry,
    qState,
    canonicalCity,
    qLga,
    qAddress,
    qApartment,
    qZip,
    qFirstName,
    qLastName,
    qEmail,
    qPhone,
    cartSignature,
  ]);

  // Tracks the key already requested (or in flight) and the means to cancel
  // it. Refs — never dependencies — so bookkeeping can't retrigger fetching.
  const requestedQuoteKeyRef = useRef("");
  const quoteAbortRef = useRef<AbortController | null>(null);
  const quoteIdRef = useRef(0);

  const selectedState = watched.state ?? "";

  /*
   * Load Terminal Africa's canonical delivery cities for the selected
   * Nigerian state. Kept separate from the LGA dataset on purpose: mixing
   * the two lists is what sent LGAs like "Eti-Osa" to Terminal as cities.
   */


  const stateOptions = useMemo(
    () => locations.map((location) => location.state),
    [locations],
  );

  // LGA / Area options come from the Nigerian locations dataset and are
  // informational only — they never reach Terminal as the delivery city.
  const lgaOptions = useMemo(
    () =>
      locations.find((location) => location.state === watched.state)?.cities ??
      [],
    [locations, watched.state],
  );

  /*
   * Request Terminal Africa quotes for delivery orders only.
   *
   * Loop-safety contract (do not regress):
   * - The ONLY reactive dependency is the stable `quoteRequestKey` string
   *   (plus method/completeness flags). Store updates made below
   *   (setStatus/setQuotes/setError/reset) never change the key, so the
   *   effect cannot retrigger itself.
   * - Pickup never quotes and never touches Terminal loading state.
   * - A changed key invalidates the previous quote immediately, so a stale
   *   rate is never selectable for a new address.
   * - Debounced (650ms), abortable, and only the latest request may write
   *   state — a superseded response is dropped, never applied.
   */
  useEffect(() => {
    if (fulfillmentMethod !== "delivery") {
      resetDelivery();
      return;
    }
    if (!qState.trim() || !addressComplete || !items.length) {
      resetDelivery();
      return;
    }
    const isLagos = qState.trim().toLowerCase() === "lagos";
    setQuotes([
      isLagos
        ? {
            rateId: "babysecret_instant",
            carrierName: "Instant Delivery",
            carrierSlug: "babysecret-instant",
            service: "Dispatch fee paid directly to the rider",
            amount: 0,
            currency: "NGN",
          }
        : {
            rateId: "babysecret_waybill",
            carrierName: "Waybill Delivery",
            carrierSlug: "babysecret-waybill",
            service: "Standard waybill shipping",
            amount: 4000,
            currency: "NGN",
          },
    ]);
  }, [fulfillmentMethod, qState, addressComplete, items.length, setQuotes, resetDelivery]);
  const onSubmit = async (data: FormValues) => {
    const fulfillmentMethod: FulfillmentMethod =
      data.fulfillmentMethod === "pickup" ? "pickup" : "delivery";

    const customer: CheckoutCustomer = {
      ...data,
      state: data.state ?? "",
      city: data.city ?? "",
      lga: data.lga ?? "",
      address: data.address ?? "",
      zip: data.zip ?? "",
      paymentMethod: data.paymentMethod ?? "bank_transfer",
    };

    if (!items.length) {
      setSubmitError("Your cart is empty.");
      return;
    }

    let delivery: DeliveryQuote | undefined;
    let pickup: { locationId: string } | undefined;

    if (fulfillmentMethod === "pickup") {
      // Pickup: no Terminal Africa call and no delivery quote required.
      if (!data.pickupLocationId) {
        setSubmitError("Please select a pickup location to continue.");
        return;
      }

      pickup = { locationId: data.pickupLocationId };
    } else {
      // Delivery: a valid quote is mandatory before checkout can continue.
      if (status !== "ready" || !selectedRateId) {
        setSubmitError(
          "Please choose a delivery method before continuing, switch to pickup, or request delivery assistance.",
        );
        return;
      }

      const selectedQuote = quotes.find(
        (quote) => quote.rateId === selectedRateId,
      );

      if (!selectedQuote) {
        setSubmitError(
          "Please choose a delivery method before continuing, switch to pickup, or request delivery assistance.",
        );
        return;
      }

      delivery = selectedQuote;
    }

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
          fulfillmentMethod,
          delivery: delivery
            ? {
                rateId: delivery.rateId,
                carrier: delivery.carrierName,
                service: delivery.service,
                amount: delivery.amount,
              }
            : null,
          pickup: pickup ?? null,
          paymentMethod: customer.paymentMethod || "bank_transfer",
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        orderId?: number;
        reference?: string;
        authorizationUrl?: string;
        bankDetails?: {
          bankName: string;
          accountName: string;
          accountNumber: string;
          amount: number;
          reference: string;
        };
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
            (item) => `${item.name} is no longer available.`,
          ),
          ...(result.priceChanges ?? []).map(
            (change) =>
              `${change.before.name} changed from ${change.before.price} to ${change.after.price}.`,
          ),
        ]);

        throw new Error(result.message ?? "Checkout could not be completed.");
      }

      // Handle based on payment method
      const paymentMethod = customer.paymentMethod || "bank_transfer";

      // Redirect to payment gateway (Paystack/Flutterwave — currently
      // hidden from the UI but kept for future re-enablement)
      if (paymentMethod !== "bank_transfer" && result.authorizationUrl) {
        window.location.replace(result.authorizationUrl);
        return;
      }

      // Bank transfer - redirect to awaiting payment page.
      // Only the opaque order reference travels in the URL. The amount and the
      // receiving account are re-read server-side by
      // /api/payment/bank-transfer/details, because anything passed here would
      // be client-controlled and could be edited or forged.
      if (paymentMethod === "bank_transfer" && result.reference) {
        clearCart();

        router.push(
          `/awaiting-payment?reference=${encodeURIComponent(result.reference)}`,
        );

        return;
      }

      // Fallback for already-completed payments
      if (result.reference) {
        clearCart();

        router.push(
          `/order-confirmation?reference=${encodeURIComponent(
            result.reference,
          )}`,
        );

        return;
      }

      throw new Error("Could not initialize payment.");
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "Checkout could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectState = (value: string) => {
    setValue("state", value, { shouldValidate: true });
    if (value !== watched.state) {
      // A new state means a new Terminal city list AND a new LGA list, so
      // the previous selections (and their load error) are discarded here.
      // The loading flag is armed here too; the fetch effect above only
      // touches state inside its async callbacks.
      setValue("city", "", { shouldValidate: true });
      setValue("lga", "", { shouldValidate: false });
      setTerminalCities([]);
      setCitiesError("");
      setCitiesLoading(Boolean(value.trim()));
    }
  };

  const selectCity = (value: string) => {
    setValue("city", value, { shouldValidate: true });
  };

  const selectLga = (value: string) => {
    // Informational only — never replaces the Terminal delivery city.
    setValue("lga", value, { shouldValidate: false });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-panel grid gap-5 rounded-2xl p-6 sm:grid-cols-2 sm:p-8"
    >
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
        wide
        register={register}
        error={errors.email}
      />

      <FormField
        name="phone"
        label="Phone number"
        type="tel"
        wide
        register={register}
        error={errors.phone}
      />

      <FormField
        name="country"
        label="Country"
        register={register}
        error={errors.country}
      />

      {fulfillmentMethod === "delivery" ? (
        <>
          {isNigeria ? (
            <FormSelectField
              name="state"
              label="State"
              options={stateOptions}
              value={watched.state ?? ""}
              onChange={selectState}
              error={errors.state}
            />
          ) : (
            <FormField
              name="state"
              label="State"
              register={register}
              error={errors.state}
            />
          )}

          <FormField
            name="city"
            label="City / Town"
            register={register}
            error={errors.city}
          />

          {isNigeria && citiesError ? (
            <p className="text-xs text-red-700 sm:col-span-2" role="alert">
              {citiesError}
            </p>
          ) : null}

          {isNigeria &&
          !citiesLoading &&
          !citiesError &&
          selectedState.trim() &&
          terminalCities.length === 0 ? (
            <p className="text-xs text-[#334f6d] sm:col-span-2" role="status">
              No delivery areas found for this state. You can still pick up
              your order for free or request delivery assistance below.
            </p>
          ) : null}

          {isNigeria ? (
            <FormSelectField
              name="lga"
              label="LGA / Area (optional)"
              hint="Your local area — for the address only, not the delivery calculation."
              options={lgaOptions}
              value={watched.lga ?? ""}
              onChange={selectLga}
            />
          ) : null}

          <FormField
            name="address"
            label="Street address"
            wide
            register={register}
            error={errors.address}
          />

          <FormField
            name="apartment"
            label="Apartment, landmark (optional)"
            wide
            register={register}
            error={errors.apartment}
          />

          <FormField
            name="zip"
            label="Postal / ZIP code"
            register={register}
            error={errors.zip}
          />
        </>
      ) : null}

      <FulfillmentMethodSelector state={qState} />

      {fulfillmentMethod === "delivery" ? (
        <>
          <DeliveryMethods state={qState} subtotal={items.reduce((sum, item) => sum + item.price * item.quantity, 0)} />
          <DeliveryAssistanceModal
            open={showAssistance}
            initialValues={assistanceInitialValues}
            items={assistanceItems}
            onClose={() => setAssistanceOpen(false)}
          />
        </>
      ) : (
        <PickupLocations />
      )}

      <div className="sm:col-span-2">
        <h3 className="text-sm font-semibold">Payment method</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {VISIBLE_PAYMENT_METHODS.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition hover:border-[#005dbd] focus-within:ring-2 focus-within:ring-[#005dbd] focus-within:ring-offset-1 ${
                watched.paymentMethod === option.id
                  ? "border-[#005dbd] bg-[#e7effc] ring-1 ring-[#005dbd]"
                  : "border-[#64748b] bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={watched.paymentMethod === option.id}
                  onChange={() => setValue("paymentMethod", option.id, { shouldValidate: true })}
                  className="size-4 shrink-0 accent-[#005dbd]"
                />
                <span className="flex flex-col">
                  <span className="block font-semibold">
                    {option.icon === "bank" ? (
                      <>
                        <Building2 className="inline-block size-4 mr-1" />
                        {option.label}
                      </>
                    ) : (
                      <>
                        <CreditCard className="inline-block size-4 mr-1" />
                        {option.label}
                      </>
                    )}
                  </span>
                  <span className="block text-[11px] text-[#334f6d]">
                    {option.hint}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-[#e7effc] px-4 py-3 text-xs leading-relaxed text-[#334f6d]">
          Pay by bank transfer. You&apos;ll receive our account details after
          placing your order, and we&apos;ll process it once your transfer is
          verified.
        </p>
      </div>

      <label className="grid gap-2 text-sm sm:col-span-2" htmlFor="notes">
        {fulfillmentMethod === "pickup"
          ? "Pickup notes (optional)"
          : "Delivery notes (optional)"}
        <textarea
          id="notes"
          {...register("notes")}
          className="glass-control min-h-24 rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
        />
      </label>

      {cartIssues.length > 0 && <CartIssuesAlert issues={cartIssues} />}

      {submitError && (
        <p className="text-sm text-red-700 sm:col-span-2" role="alert">
          {submitError}
        </p>
      )}

      <button
        disabled={submitting || !items.length}
        className="rounded-full bg-[#005dbd] px-6 py-3 font-semibold text-white transition hover:bg-[#004a97] focus-visible:ring-2 focus-visible:ring-[#005dbd] focus-visible:ring-offset-2 active:bg-[#004a97] disabled:cursor-not-allowed disabled:bg-[#dbe7f3] disabled:text-[#334f6d] disabled:hover:bg-[#dbe7f3] sm:col-span-2 sm:justify-self-start"
      >
        {submitting
          ? watched.paymentMethod === "bank_transfer"
            ? "Creating order…"
            : "Redirecting to payment…"
          : watched.paymentMethod === "bank_transfer"
          ? "Place order & get bank details"
          : "Continue to payment"}
      </button>

      <p className="text-xs text-[#334f6d] sm:col-span-2">
        {watched.paymentMethod === "bank_transfer"
          ? "You will receive bank transfer details after placing your order."
          : "You will be redirected to complete your payment securely."}
      </p>
    </form>
  );
}
