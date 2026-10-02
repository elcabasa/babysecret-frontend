import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { auth } from "@/auth";
import { getPaymentProvider } from "@/services/payment/payment.service";
import { toFormBody } from "@/lib/woocommerce-auth";
import {
  sendOrderReceivedEmail,
  sendPaymentAwaitingEmail,
} from "@/lib/email/order-emails";
import type { RawWooOrder } from "@/lib/woocommerce-orders";
import {
  formatPickupAddress,
  getPickupLocation,
} from "@/config/pickup";
import {
  getDeliveryQuotes,
  getShippingProviderName,
} from "@/services/shipping/shipping.service";
import {
  defaultPickupAddress,
  countryToCode,
} from "@/services/shipping/tship.service";
import {
  checkNigeriaTerminalCity,
  isNigeriaCountry,
} from "@/services/shipping/address-resolution";
import { checkCartStock } from "@/lib/woo-stock";
import {
  DEFAULT_PARCEL_ITEM_WEIGHT_KG,
  resolveParcelWeights,
} from "@/services/shipping/weight.service";
import type { CheckoutDelivery, FulfillmentMethod } from "@/types/order";

/**
 * WooCommerce shipping method id used to represent a pickup line.
 *
 * Pickup orders have no carrier rate, so `shipping_lines` describes the
 * collection point instead of a Terminal Africa rate. This keeps the order
 * meaningful in the WooCommerce admin (and in order emails) without requiring
 * a Terminal `rate_id`.
 */
const PICKUP_SHIPPING_METHOD_ID = "babysecret_pickup";

const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    country: z.string().min(2),
    // Required for delivery; optional for pickup (no courier involved).
    state: z.string().optional().default(""),
    city: z.string().optional().default(""),
    // LGA / Area is informational only — never the Terminal delivery city.
    lga: z.string().max(100).optional().default(""),
    address: z.string().optional().default(""),
    apartment: z.string().optional(),
    zip: z.string().optional().default(""),
    notes: z.string().optional(),
    paymentMethod: z.enum(["paystack", "flutterwave", "bank_transfer"]).optional(),
  }),

  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional(),
        price: z.number().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),

  fulfillmentMethod: z.enum(["delivery", "pickup"]).optional(),

  delivery: z
    .object({
      rateId: z.string().min(1),
      carrier: z.string().min(1),
      service: z.string().optional(),
      amount: z.number().nonnegative(),
    })
    .nullable()
    .optional(),

  pickup: z
    .object({
      locationId: z.string().min(1),
    })
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  // Delivery needs a complete destination: Terminal validates and quotes
  // against it, and persisting address data requires a real postal code.
  if ((data.fulfillmentMethod ?? "delivery") === "delivery") {
    const required: [string, string][] = [
      ["state", data.customer.state],
      ["city", data.customer.city],
      ["address", data.customer.address],
    ];

    for (const [path, value] of required) {
      if (!value.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer", path],
          message: "A complete delivery address is required.",
        });
      }
    }

    if (data.customer.zip.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer", "zip"],
        message: "A postal/ZIP code is required for delivery.",
      });
    }
  }
});

type CheckoutCustomer = z.infer<typeof checkoutSchema>["customer"];
type CheckoutItems = z.infer<typeof checkoutSchema>["items"];

/**
 * Resolves the delivery address for Terminal Africa. The LGA rides along as
 * street-level context only — the Terminal city is always the canonical
 * City / Delivery Area the customer selected.
 */
function toShippingAddress(customer: CheckoutCustomer) {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    line1: customer.address,
    line2: [customer.apartment, customer.lga]
      .map((part) => part?.trim() ?? "")
      .filter(Boolean)
      .join(", "),
    city: customer.city,
    state: customer.state,
    country: customer.country,
    zip: customer.zip,
  };
}

async function verifyDeliveryQuote(
  delivery: CheckoutDelivery,
  customer: CheckoutCustomer,
  items: CheckoutItems,
): Promise<CheckoutDelivery | null> {
  /*
   * Re-resolve authoritative WooCommerce weights with the same helper used by
   * `/api/shipping/quotes`. The checkout payload has no weight field, so the
   * browser cannot override the value used for re-verification.
   */
  const resolvedWeights = await resolveParcelWeights(
    items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  );

  console.info("[shipping] Re-verified parcel weights", {
    items: resolvedWeights.items.map((item) => ({
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      unitWeightKg: item.unitWeightKg,
      quantity: item.quantity,
      lineWeightKg: item.lineWeightKg,
      source: item.source,
    })),
    totalParcelWeightKg: resolvedWeights.totalParcelWeightKg,
  });

  const parcelItems = items.map((item, index) => ({
    id: item.productId,
    name: item.name ?? item.productId,
    value: (item.price ?? 0) * item.quantity,
    weight:
      resolvedWeights.items[index]?.unitWeightKg ??
      DEFAULT_PARCEL_ITEM_WEIGHT_KG,
    quantity: item.quantity,
  }));

  const quotes = await getDeliveryQuotes({
    pickup: defaultPickupAddress(),
    delivery: toShippingAddress(customer),
    items: parcelItems,
  });

  const match = quotes.find(
    (quote) =>
      quote.carrierName === delivery.carrier &&
      Math.abs(quote.amount - delivery.amount) <= 1 &&
      (!delivery.service || quote.service === delivery.service),
  );

  if (!match) return null;

  return {
    rateId: match.rateId,
    carrier: match.carrierName,
    service: match.service,
    amount: match.amount,
  };
}

/**
 * Builds the order meta for a fulfillment method.
 *
 * Pickup orders record the collection point (name, address, fee) so the
 * WooCommerce admin and transactional emails can both read it back. Delivery
 * orders keep the existing Terminal Africa rate meta unchanged.
 */
function buildOrderMeta(
  reference: string,
  fulfillmentMethod: FulfillmentMethod,
  delivery: CheckoutDelivery | null,
  pickup: {
    id: string;
    name: string;
    address: string;
    fee: number;
  } | null,
): { key: string; value: string }[] {
  const base: { key: string; value: string }[] = [
    { key: "_babysecret_paystack_reference", value: reference },
    { key: "_babysecret_fulfillment_method", value: fulfillmentMethod },
  ];

  if (fulfillmentMethod === "pickup") {
    return [
      ...base,
      {
        key: "_babysecret_pickup_location_id",
        value: pickup?.id ?? "",
      },
      {
        key: "_babysecret_pickup_location_name",
        value: pickup?.name ?? "",
      },
      {
        key: "_babysecret_pickup_location_address",
        value: pickup?.address ?? "",
      },
      {
        key: "_babysecret_pickup_fee",
        value: String(pickup?.fee ?? 0),
      },
    ];
  }

  if (!delivery) return base;

  const provider = getShippingProviderName();
  const prefix =
    provider === "tship"
      ? "_babysecret_tship"
      : provider === "shipbubble"
        ? "_babysecret_shipbubble"
        : "_babysecret_shipping";

  return [
    ...base,
    { key: `${prefix}_rate_id`, value: delivery.rateId },
    { key: `${prefix}_carrier`, value: delivery.carrier },
    { key: `${prefix}_service`, value: delivery.service ?? "" },
    { key: `${prefix}_amount`, value: String(delivery.amount) },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid checkout information.",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { customer, items, pickup: pickupInput } = parsed.data;

    /*
     * Resolve the fulfillment method and its data.
     *
     * A pickup request must name a known location. The name, address and fee
     * are read from server configuration, never from the request body, so a
     * tampered payload cannot change what the customer is charged.
     */
    const requestedMethod = parsed.data.fulfillmentMethod ?? "delivery";
    const pickupRequested = pickupInput?.locationId
      ? getPickupLocation(pickupInput.locationId)
      : null;

    const fulfillmentMethod: FulfillmentMethod =
      requestedMethod === "pickup" && pickupRequested ? "pickup" : "delivery";

    if (requestedMethod === "pickup" && !pickupRequested) {
      return NextResponse.json(
        {
          message:
            "That pickup location is no longer available. Please choose another.",
        },
        { status: 400 },
      );
    }

    let delivery = parsed.data.delivery ?? null;

    if (fulfillmentMethod === "delivery") {
      /*
       * Delivery keeps its existing contract: a Terminal Africa quote is
       * re-verified server-side and checkout is rejected if it no longer holds.
       * The city must additionally be a Terminal canonical city for Nigeria —
       * an LGA sent as the city is rejected with a friendly message, using
       * the same check as `/api/shipping/quotes`.
       */
      if (!delivery) {
        return NextResponse.json(
          {
            message:
              "Please choose a delivery method before continuing, or switch to pickup.",
          },
          { status: 409 },
        );
      }

      if (isNigeriaCountry(customer.country)) {
        const check = await checkNigeriaTerminalCity(
          customer.state,
          customer.city,
        );

        if (check.status === "unsupported") {
          return NextResponse.json(
            {
              message:
                "Please select a City / Delivery Area from the list to calculate delivery.",
            },
            { status: 400 },
          );
        }
      }

      const verified = await verifyDeliveryQuote(delivery, customer, items);

      if (!verified) {
        return NextResponse.json(
          {
            message:
              "Your delivery estimate has changed. Please review your delivery options before continuing, or switch to pickup.",
          },
          { status: 409 },
        );
      }

      delivery = verified;
    } else {
      // Pickup orders never require — or reference — a Terminal rate id.
      delivery = null;
    }

    const pickup = pickupRequested
      ? {
          id: pickupRequested.id,
          name: pickupRequested.name,
          address: formatPickupAddress(pickupRequested),
          fee: Number.isFinite(pickupRequested.fee)
            ? pickupRequested.fee
            : 0,
        }
      : null;

    /*
     * Stock protection, before any order exists: every line is validated
     * against live WooCommerce stock (product + variation, quantity,
     * backorders). WooCommerce is the inventory authority. A bogus
     * variation id is a malformed request (400) — a selected variation must
     * never silently become its parent product. Unavailable lines use the
     * existing 409 + unavailableItems shape the checkout form renders.
     */
    const stockReport = await checkCartStock(
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        fallbackName: item.name,
      })),
    );

    if (stockReport.invalidVariationName) {
      return NextResponse.json(
        {
          message: `The selected option for "${stockReport.invalidVariationName}" is no longer available. Please reselect it.`,
        },
        { status: 400 },
      );
    }

    if (!stockReport.valid) {
      return NextResponse.json(
        {
          message: "Some items in your cart are no longer available.",
          unavailableItems: stockReport.unavailableNames.map((name) => ({
            name,
          })),
        },
        { status: 409 },
      );
    }

    const wooUrl = process.env.WOOCOMMERCE_REST_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          message: "WooCommerce is not configured.",
        },
        { status: 500 },
      );
    }

/*
     * Create a unique reference.
     * This will connect:
     *
     * WooCommerce Order
     *        ↓
     * Payment Transaction
     *
     * The reference is shown to the customer and is the only credential the
     * bank-transfer page carries, so it must NOT be guessable. A bare
     * millisecond timestamp is enumerable — anyone could walk the range and read
     * other people's order totals — so it is mixed with 48 bits of random hex.
     * It stays human-readable and sortable (timestamp first).
     */
    const reference = `babysecret-${Date.now()}-${randomBytes(6).toString("hex")}`;

    const wooAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    );

    // Determine payment method from customer data (default to bank_transfer;
    // paystack/flutterwave remain supported for future re-enablement)
    const paymentMethod = customer.paymentMethod || "bank_transfer";
    const paymentMethodTitle =
      paymentMethod === "paystack"
        ? "Paystack"
        : paymentMethod === "flutterwave"
        ? "Flutterwave"
        : "Bank Transfer";

    const isBankTransfer = paymentMethod === "bank_transfer";

    /*
     * Create the WooCommerce order.
     *
     * When an authenticated customer places the order, link it to their
     * WooCommerce customer id — read server-side from the NextAuth session, so
     * the browser can never choose which customer an order is attributed to.
     * Guest checkouts stay unlinked (order.customer_id = 0).
     */
    const session = await auth();

    /*
     * Shipping lines.
     *
     * Delivery keeps a Terminal Africa rate line. Pickup has no carrier rate,
     * so the line records the collection point and its configured fee — no
     * `rate_id` is required or stored.
     */
    const shippingLines =
      fulfillmentMethod === "pickup"
        ? [
            {
              method_id: PICKUP_SHIPPING_METHOD_ID,
              method_title: `Pickup — ${pickup?.name ?? "Baby Secret"}`,
              total: String(pickup?.fee ?? 0),
            },
          ]
        : delivery
          ? [
              {
                method_id:
                  getShippingProviderName() === "tship"
                    ? "terminal_tship"
                    : getShippingProviderName() === "shipbubble"
                      ? "shipbubble_default"
                      : delivery.rateId,
                method_title: delivery.carrier,
                total: String(delivery.amount),
              },
            ]
          : [];

    /*
     * Make the collection point visible in WooCommerce's own order views and
     * emails. The shipping line and order meta already carry pickup details,
     * but standard YayMail/WooCommerce templates do not necessarily render
     * custom meta. Prefixing the customer note preserves any shopper-supplied
     * note while ensuring the pickup location and address travel with the
     * order itself.
     */
    const customerNote = [
      fulfillmentMethod === "pickup" && pickup
        ? `Pickup collection: ${pickup.name} — ${pickup.address}`
        : "",
      customer.notes?.trim() ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // LGA is local-address context for the WooCommerce order views and
    // emails (same merge as the Terminal line2). The Terminal city itself is
    // always the canonical City / Delivery Area.
    const addressLine2 = [customer.apartment, customer.lga]
      .map((part) => part?.trim() ?? "")
      .filter(Boolean)
      .join(", ");

    const orderBody = toFormBody({
      customer_id: session?.user?.id ? Number(session.user.id) : undefined,
      payment_method: paymentMethod,
      payment_method_title: paymentMethodTitle,
      set_paid: false,
      billing: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address_1: customer.address || "",
        address_2: addressLine2,
        city: customer.city || "",
        state: customer.state || "",
        country: countryToCode(customer.country),
      },
      shipping: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        address_1: customer.address || "",
        address_2: addressLine2,
        city: customer.city || "",
        state: customer.state || "",
        country: countryToCode(customer.country),
      },
      customer_note: customerNote,
      // Resolved numeric ids (variation validated against its parent), so
      // WooCommerce decrements the exact purchased stock record.
      line_items: stockReport.validLines.map((line) => ({
        product_id: line.productId,
        ...(line.variationId !== null
          ? { variation_id: line.variationId }
          : {}),
        quantity: line.quantity,
      })),
      shipping_lines: shippingLines,
      meta_data: buildOrderMeta(
        reference,
        fulfillmentMethod,
        delivery,
        pickup,
      ),
    });

    const wooResponse = await fetch(`${wooUrl}/orders`, {
      method: "POST",

      headers: {
        Authorization: `Basic ${wooAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: orderBody,
    });

    const wooOrder = (await wooResponse.json()) as RawWooOrder & {
      message?: string;
    };

    if (!wooResponse.ok) {
      // Log the status and Woo's message only — the full response body can echo
      // back customer PII (name, email, phone, address) into the log store.
      console.error(
        `WooCommerce order creation failed (HTTP ${wooResponse.status}): ${wooOrder.message ?? "no message"}`,
      );

      return NextResponse.json(
        {
          message:
            wooOrder.message || "Could not create your WooCommerce order.",
        },
        { status: 500 },
      );
    }

    /*
     * Get the real WooCommerce order total.
     *
     * Never trust the price sent from the frontend.
     */
    const orderTotal = Number(wooOrder.total);

    if (!orderTotal || orderTotal <= 0) {
      return NextResponse.json(
        {
          message: "Invalid order total.",
        },
        { status: 400 },
      );
    }

    /*
     * Send the custom customer acknowledgment. WooCommerce separately sends its
     * canonical admin New Order message. Email failure cannot fail checkout.
     */
    await sendOrderReceivedEmail(wooOrder);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const callbackUrl = `${appUrl}/api/payment/verify?reference=${encodeURIComponent(reference)}`;

    // Use the selected payment provider
    const paymentProvider = getPaymentProvider(paymentMethod);

    const payment = await paymentProvider.initializePayment({
      email: customer.email,
      amount: orderTotal,
      reference,
      callbackUrl,
      customerName: `${customer.firstName} ${customer.lastName}`,
      phoneNumber: customer.phone,
    });

    // Handle bank transfer differently - it returns awaiting_transfer status with bankDetails
    if (isBankTransfer) {
      if (payment.status !== "awaiting_transfer" || !payment.bankDetails) {
        return NextResponse.json(
          {
            message: "Could not initialize bank transfer. Check the server logs.",
          },
          { status: 500 },
        );
      }

      // For bank transfer, return bank details without authorizationUrl
      /*
       * Send only the custom awaiting-payment instructions. WooCommerce +
       * FluentSMTP sends its own New Order admin message, and the payment
       * instructions must not be duplicated. Email failure cannot fail checkout.
       */
      await sendPaymentAwaitingEmail(wooOrder, {
        bankName: payment.bankDetails.bankName,
        accountName: payment.bankDetails.accountName,
        accountNumber: payment.bankDetails.accountNumber,
      });

      return NextResponse.json({
        success: true,

        orderId: wooOrder.id,

        reference,

        bankDetails: payment.bankDetails,
      });
    }

    // For Paystack/Flutterwave, require authorizationUrl
    if (payment.status !== "initialized" || !payment.authorizationUrl) {
      return NextResponse.json(
        {
          message: "Could not initialize payment. Check the server logs.",
        },
        { status: 500 },
      );
    }

    /*
     * Return the payment URL to the frontend.
     */
    return NextResponse.json({
      success: true,

      orderId: wooOrder.id,

      reference,

      authorizationUrl: payment.authorizationUrl,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while processing checkout.";

    return NextResponse.json(
      {
        message,
      },
      { status: 500 },
    );
  }
}
