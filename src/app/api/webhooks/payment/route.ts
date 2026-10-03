import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import {
  getPaymentProvider,
  isSufficientPayment,
} from "@/services/payment/payment.service";
import { getWooOrderByReference } from "@/lib/woocommerce-orders";

type ProviderName = "paystack" | "flutterwave";

/**
 * Compares two signature strings without leaking through timing and without
 * throwing when lengths differ (`timingSafeEqual` throws on length mismatch,
 * which would turn a forged signature into a 500 instead of a 401).
 */
function signaturesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length || left.length === 0) return false;

  return crypto.timingSafeEqual(left, right);
}

/**
 * Idempotency for successfully processed provider events (by provider event
 * id). Retried webhooks after success acknowledge without re-updating the
 * order; retries after failure fall through and reprocess normally.
 */
const succeededWebhookEvents = new Set<string>();

function markSucceeded(eventId: string): void {
  succeededWebhookEvents.add(eventId);

  if (succeededWebhookEvents.size > 2000) {
    const oldest = succeededWebhookEvents.values().next().value;
    if (oldest !== undefined) succeededWebhookEvents.delete(oldest);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const paystackSignature = request.headers.get("x-paystack-signature");

    // Flutterwave's documented header is `verif-hash`; accept the legacy
    // alias too so existing dashboard configurations keep working.
    const flutterwaveSignature =
      request.headers.get("verif-hash") ??
      request.headers.get("flutterwave-signature");

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

      if (!signaturesEqual(hash, paystackSignature)) {
        return NextResponse.json(
          { message: "Invalid Paystack signature." },
          { status: 401 },
        );
      }

      provider = "paystack";
    }

    /*
     * FLUTTERWAVE SIGNATURE VERIFICATION
     *
     * Flutterwave sends the exact webhook secret hash configured in its
     * dashboard as the `verif-hash` header (aliased here as
     * `flutterwave-signature`). It is compared directly — Flutterwave does
     * not HMAC the body for this header.
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

      if (!signaturesEqual(secretHash.trim(), flutterwaveSignature.trim())) {
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
    let providerEventId: string | undefined;
    let successfulPayment = false;

    if (provider === "paystack") {
      if (payload.event !== "charge.success") {
        return NextResponse.json({ received: true });
      }

      reference = payload.data?.reference;
      providerEventId =
        payload.data?.id !== undefined ? `paystack:${payload.data.id}` : undefined;
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

      providerEventId = transactionId
        ? `flutterwave:${transactionId}`
        : undefined;

      successfulPayment = true;
    }

    if (!successfulPayment || !reference) {
      return NextResponse.json({ received: true });
    }

    // Already applied this exact provider event: acknowledge, don't re-apply.
    if (providerEventId && succeededWebhookEvents.has(providerEventId)) {
      return NextResponse.json({ received: true, alreadyProcessed: true });
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
     * Find the order by EXACT reference match (WooCommerce ignores
     * meta_key/meta_value collection params — never orders[0]).
     */
    const order = await getWooOrderByReference(reference);

    if (!order) {
      console.error("No order found for webhook reference:", reference);

      return NextResponse.json({ received: true });
    }

    /*
     * Idempotency:
     * If already processing or completed,
     * don't update it again. A replayed provider event for an order that is
     * still open falls through to the checks below (which re-verify amount
     * and stock state through the live APIs), so only genuinely successful,
     * fully-applied events are skipped via `succeededWebhookEvents`.
     */
    if (order.status === "processing" || order.status === "completed") {
      return NextResponse.json({
        received: true,
        alreadyProcessed: true,
      });
    }

    /*
     * Amount enforcement (same rule as the callback verification): the
     * provider-reported amount must cover the WooCommerce order total in NGN
     * for this reference. Underpaid transactions never mark the order paid.
     */
    const orderTotal = Number(order.total);

    if (
      !isSufficientPayment({
        verification,
        expectedReference: reference,
        orderTotal,
        orderCurrency: order.currency ?? "NGN",
      })
    ) {
      console.error("Webhook payment amount insufficient for order total:", {
        provider,
        orderId: order.id,
      });

      return NextResponse.json({ received: true });
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

    if (!updateResponse.ok) {
      // Status only: the response body can echo customer PII.
      console.error(
        `WooCommerce webhook order update failed (HTTP ${updateResponse.status}).`,
      );

      throw new Error("Could not update WooCommerce order.");
    }

    // A retried delivery of this exact provider event acknowledges without
    // touching the order again. Failures never land here, so a retry after
    // a failure still reprocesses normally.
    if (providerEventId) markSucceeded(providerEventId);

    console.info("Payment webhook processed successfully:", {
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
