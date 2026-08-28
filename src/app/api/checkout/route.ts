import { NextResponse } from "next/server";
import { z } from "zod";

import { getPaymentProvider } from "@/services/payment/payment.service";
import { toFormBody } from "@/lib/woocommerce-auth";
import { getDeliveryQuotes, getShippingProviderName } from "@/services/shipping/shipping.service";
import { defaultPickupAddress, defaultItemWeightKg, countryToCode } from "@/services/shipping/tship.service";
import type { CheckoutDelivery } from "@/types/order";

const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    country: z.string().min(2),
    state: z.string().min(2),
    city: z.string().min(2),
    address: z.string().min(5),
    apartment: z.string().optional(),
    notes: z.string().optional(),
  }),

  items: z
    .array(
      z.object({
        productId: z.string(),
        name: z.string().optional(),
        price: z.number().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),

  delivery: z
    .object({
      rateId: z.string().min(1),
      carrier: z.string().min(1),
      service: z.string().optional(),
      amount: z.number().nonnegative(),
    })
    .nullable()
    .optional(),
});

async function verifyDeliveryQuote(
  delivery: CheckoutDelivery,
  customer: z.infer<typeof checkoutSchema>["customer"],
  items: z.infer<typeof checkoutSchema>["items"]
): Promise<CheckoutDelivery | null> {
  const parcelItems = items.map((item) => ({
    id: item.productId,
    name: item.name ?? item.productId,
    value: (item.price ?? 0) * item.quantity,
    weight: defaultItemWeightKg,
    quantity: item.quantity,
  }));

  const quotes = await getDeliveryQuotes({
    pickup: defaultPickupAddress(),
    delivery: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      line1: customer.address,
      line2: customer.apartment,
      city: customer.city,
      state: customer.state,
      country: customer.country,
    },
    items: parcelItems,
  });

  const match = quotes.find(
    (quote) =>
      quote.carrierName === delivery.carrier &&
      Math.abs(quote.amount - delivery.amount) <= 1 &&
      (!delivery.service || quote.service === delivery.service)
  );

  if (!match) return null;

  return {
    rateId: match.rateId,
    carrier: match.carrierName,
    service: match.service,
    amount: match.amount,
  };
}

export async function POST(request: Request) {
  console.log("Environment:", process.env.NODE_ENV);
console.log("Provider value:", JSON.stringify(process.env.PAYMENT_PROVIDER));
console.log(
  "All payment-related env keys:",
  Object.keys(process.env).filter((key) =>
    key.includes("PAYMENT") || key.includes("PAYSTACK")
  )
);

  console.log("=== CHECKOUT ENVIRONMENT TEST ===");

  console.log(
    "Payment provider:",
    process.env.PAYMENT_PROVIDER
  );

  console.log(
    "Paystack key exists:",
    Boolean(process.env.PAYSTACK_SECRET_KEY)
  );

  console.log(
    "WooCommerce URL exists:",
    Boolean(process.env.WOOCOMMERCE_REST_URL)
  );

  console.log(
    "WooCommerce key exists:",
    Boolean(process.env.WOOCOMMERCE_CONSUMER_KEY)
  );


  try {
    const body = await request.json();

    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid checkout information.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

   const { customer, items } = parsed.data;

   let delivery = parsed.data.delivery ?? null;

    if (delivery) {
      const verified = await verifyDeliveryQuote(delivery, customer, items);

      if (!verified) {
        return NextResponse.json(
          {
            message:
              "Your delivery estimate has changed. Please review your delivery options before continuing.",
          },
          { status: 409 }
        );
      }

      delivery = verified;
    }

    const wooUrl = process.env.WOOCOMMERCE_REST_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          message: "WooCommerce is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * Create a unique reference.
     * This will connect:
     *
     * WooCommerce Order
     *        ↓
     * Paystack Transaction
     */
    const reference = `babysecret-${Date.now()}`;

    const auth = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    /*
     * Create the WooCommerce order.
     */
    const orderBody = toFormBody({
      payment_method: "paystack",
      payment_method_title: "Paystack",
      set_paid: false,
      billing: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address_1: customer.address,
        address_2: customer.apartment || "",
        city: customer.city,
        state: customer.state,
        country: countryToCode(customer.country),
      },
      shipping: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        address_1: customer.address,
        address_2: customer.apartment || "",
        city: customer.city,
        state: customer.state,
        country: countryToCode(customer.country),
      },
      customer_note: customer.notes || "",
      line_items: items.map((item) => ({
        product_id: Number(item.productId),
        quantity: item.quantity,
      })),
      shipping_lines: delivery
        ? [
            {
              method_id:
                getShippingProviderName() === "tship"
                  ? "terminal_tship"
                  : delivery.rateId,
              method_title: delivery.carrier,
              total: String(delivery.amount),
            },
          ]
        : [],
      meta_data: [
        { key: "_babysecret_paystack_reference", value: reference },
        ...(delivery
          ? [
              { key: "_babysecret_shipping_rate_id", value: delivery.rateId },
              { key: "_babysecret_shipping_carrier", value: delivery.carrier },
              { key: "_babysecret_shipping_service", value: delivery.service ?? "" },
              { key: "_babysecret_shipping_amount", value: String(delivery.amount) },
            ]
          : []),
        ...(delivery && getShippingProviderName() === "tship"
          ? [
              { key: "_babysecret_tship_rate_id", value: delivery.rateId },
              { key: "_babysecret_tship_carrier", value: delivery.carrier },
              { key: "_babysecret_tship_service", value: delivery.service ?? "" },
              { key: "_babysecret_tship_amount", value: String(delivery.amount) },
            ]
          : []),
      ],
    });

    const wooResponse = await fetch(`${wooUrl}/orders`, {
      method: "POST",

      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: orderBody,
    });

    const wooOrder = await wooResponse.json();

    if (!wooResponse.ok) {
      console.error("WooCommerce order error:", wooOrder);

      return NextResponse.json(
        {
          message:
            wooOrder.message ||
            "Could not create your WooCommerce order.",
        },
        { status: 500 }
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
        { status: 400 }
      );
    }

    /*
     * Initialize Paystack.
     */
   const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const callbackUrl =
  `${appUrl}/api/payment/verify?reference=${encodeURIComponent(reference)}`;

const paymentProvider = getPaymentProvider();

const payment = await paymentProvider.initializePayment({
  email: customer.email,
  amount: orderTotal,
  reference,
  callbackUrl,
  customerName: `${customer.firstName} ${customer.lastName}`,
  phoneNumber: customer.phone,
});
if (
  payment.status !== "initialized" ||
  !payment.authorizationUrl
) {
  return NextResponse.json(
    {
      message: "Could not initialize payment. Check the server logs.",
    },
    { status: 500 }
  );
}

    /*
     * Return the Paystack URL to the frontend.
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
    { status: 500 }
  );
}
}