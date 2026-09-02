import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { getPaymentProvider } from "@/services/payment/payment.service";

type ProviderName = "paystack" | "flutterwave";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const paystackSignature = request.headers.get("x-paystack-signature");

    const flutterwaveSignature = request.headers.get("flutterwave-signature");

    let provider: ProviderName | null = null;

    /*
     * PAYSTACK SIGNATURE VERIFICATION
     */
    if (paystackSignature) {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        return NextResponse.json(
          { message: "Paystack is not configured." },
          { status: 500 },
        );
      }

      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      if (
        !crypto.timingSafeEqual(
          Buffer.from(hash),
          Buffer.from(paystackSignature),
        )
      ) {
        return NextResponse.json(
          { message: "Invalid Paystack signature." },
          { status: 401 },
        );
      }

      provider = "paystack";
    }

    /*
     * FLUTTERWAVE SIGNATURE VERIFICATION
     */
    else if (flutterwaveSignature) {
      const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

      if (!secretHash) {
        return NextResponse.json(
          {
            message: "Flutterwave webhook secret hash is not configured.",
          },
          { status: 500 },
        );
      }

      const hash = crypto
        .createHmac("sha256", secretHash)
        .update(rawBody)
        .digest("base64");

      if (
        !crypto.timingSafeEqual(
          Buffer.from(hash),
          Buffer.from(flutterwaveSignature),
        )
      ) {
        return NextResponse.json(
          { message: "Invalid Flutterwave signature." },
          { status: 401 },
        );
      }

      provider = "flutterwave";
    }

    if (!provider) {
      return NextResponse.json(
        { message: "Unknown payment provider." },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody);

    /*
     * Extract payment details depending on provider.
     */
    let reference: string | undefined;
    let transactionId: string | undefined;
    let successfulPayment = false;

    if (provider === "paystack") {
      if (payload.event !== "charge.success") {
        return NextResponse.json({ received: true });
      }

      reference = payload.data?.reference;
      successfulPayment = true;
    }

    if (provider === "flutterwave") {
      if (payload.type !== "charge.completed") {
        return NextResponse.json({ received: true });
      }

      const status = payload.data?.status;

      if (status !== "successful" && status !== "succeeded") {
        return NextResponse.json({ received: true });
      }

      reference = payload.data?.tx_ref || payload.data?.reference;

      transactionId = String(
        payload.data?.id || payload.data?.transaction_id || "",
      );

      successfulPayment = true;
    }

    if (!successfulPayment || !reference) {
      return NextResponse.json({ received: true });
    }

    /*
     * Verify with the actual payment provider.
     *
     * Do not trust the webhook payload alone.
     */
    const paymentProvider = getPaymentProvider(provider);

    const verification = await paymentProvider.verifyPayment(
      reference,
      transactionId || undefined,
    );

    if (!verification.verified) {
      console.error("Webhook payment verification failed:", {
        provider,
        reference,
      });

      return NextResponse.json({ received: true });
    }

    /*
     * WooCommerce configuration.
     */
    const wooUrl = process.env.WOOCOMMERCE_REST_URL;

    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;

    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      throw new Error("WooCommerce is not configured.");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    );

    /*
     * Find the order using our payment reference.
     */
    const ordersResponse = await fetch(
      `${wooUrl}/orders?meta_key=_babysecret_paystack_reference&meta_value=${encodeURIComponent(
        reference,
      )}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    );

    const orders = await ordersResponse.json();

    if (!ordersResponse.ok || !Array.isArray(orders)) {
      throw new Error("Could not find WooCommerce order.");
    }

    const order = orders[0];

    if (!order) {
      console.error("No order found for webhook reference:", reference);

      return NextResponse.json({ received: true });
    }

    /*
     * Idempotency:
     * If already processing or completed,
     * don't update it again.
     */
    if (order.status === "processing" || order.status === "completed") {
      return NextResponse.json({
        received: true,
        alreadyProcessed: true,
      });
    }

    /*
     * Update WooCommerce order.
     */
    const updateResponse = await fetch(`${wooUrl}/orders/${order.id}`, {
      method: "PUT",

      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status: "processing",
        set_paid: true,
        transaction_id: transactionId || reference,
      }),
    });

    const updatedOrder = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("WooCommerce webhook update failed:", updatedOrder);

      throw new Error("Could not update WooCommerce order.");
    }

    console.log("Payment webhook processed successfully:", {
      provider,
      reference,
      orderId: order.id,
    });

    return NextResponse.json({
      received: true,
      updated: true,
    });
  } catch (error) {
    console.error("Payment webhook error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
