import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import {
  dispatchOrderStatusEmails,
} from "@/lib/email/order-emails";
import {
  getWooOrderById,
  type RawWooOrder,
} from "@/lib/woocommerce-orders";

/**
 * WooCommerce "Order updated" webhook receiver.
 *
 * WooCommerce + FluentSMTP owns canonical order-lifecycle mail for new orders,
 * processing, completion, cancellation, and failure. This endpoint preserves
 * the verified webhook plumbing and only dispatches custom Next.js messages
 * that WordPress does not send—currently optional shipping-plugin "shipped"
 * notices.
 *
 * It does not complete the bank-transfer payment email: after an admin moves
 * an on-hold order to Processing, WooCommerce itself sends the Processing
 * Order message through FluentSMTP.
 *
 * "I've made the transfer" deliberately does NOT mark the order paid. The
 * separate bank-transfer confirmation route sends only the custom admin claim
 * notice; the admin-driven status change remains the only path to paid status.
 *
 * Setup: WooCommerce → Settings → Advanced → Webhooks, topic `order.updated`,
 * delivery URL `<site>/api/webhooks/woocommerce/order`, secret =
 * `WOOCOMMERCE_WEBHOOK_SECRET`. See `docs/PAYMENTS.md`.
 */

/**
 * Verifies the `X-WC-Webhook-Signature` HMAC that WooCommerce sends.
 *
 * WooCommerce signs the raw request body with HMAC-SHA256 using the webhook's own
 * secret and sends the digest as base64. Without this check anyone could POST a
 * forged body and trigger order emails.
 *
 * Signature verification is deliberately independent of the Woo REST credentials
 * so it can never be silently disabled by a partial Woo misconfiguration.
 */
export function isValidSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim();

  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);

  if (provided.length !== computed.length) return false;

  return crypto.timingSafeEqual(provided, computed);
}

/** Bounded set of recently processed WooCommerce delivery ids. */
const seenDeliveryIds = new Set<string>();

export async function POST(request: NextRequest) {
  /*
   * Read the RAW body before doing anything else: HMAC verification must run
   * over the exact bytes WooCommerce signed. Parsing/re-serialising first would
   * change key order and break the digest.
   */
  const rawBody = await request.text();

  const signature = request.headers.get("x-wc-webhook-signature");

  // A missing secret is our deployment problem, not a bad request — report it
  // as a server error so it cannot be mistaken for a client/auth failure.
  if (!process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim()) {
    console.error(
      "[webhook] WOOCOMMERCE_WEBHOOK_SECRET is not set; refusing to process WooCommerce webhooks.",
    );

    return NextResponse.json(
      { message: "Webhook not configured." },
      { status: 500 },
    );
  }

  if (!signature) {
    console.warn("[webhook] Rejected WooCommerce webhook with no signature.");

    return NextResponse.json(
      { message: "Missing signature." },
      { status: 401 },
    );
  }

  if (!isValidSignature(rawBody, signature)) {
    console.warn(
      "[webhook] Rejected WooCommerce webhook with an invalid signature.",
    );

    return NextResponse.json(
      { message: "Invalid signature." },
      { status: 401 },
    );
  }

  /*
   * Replay protection: WooCommerce sends `X-WC-Webhook-Delivery-ID` per
   * delivery and retries failed ones. Already-seen delivery ids acknowledge
   * without re-dispatching. (The email dispatcher below adds its own
   * `_babysecret_emails_sent` idempotency on top.)
   */
  const deliveryId = request.headers.get("x-wc-webhook-delivery-id");

  if (deliveryId) {
    if (seenDeliveryIds.has(deliveryId)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    seenDeliveryIds.add(deliveryId);

    if (seenDeliveryIds.size > 2000) {
      const oldest = seenDeliveryIds.values().next().value;
      if (oldest !== undefined) seenDeliveryIds.delete(oldest);
    }
  }

  let payload: { id?: number };

  try {
    payload = JSON.parse(rawBody) as { id?: number };
  } catch {
    return NextResponse.json(
      { message: "Invalid payload." },
      { status: 400 },
    );
  }

  const orderId = Number(payload.id);

  if (!orderId || !Number.isFinite(orderId)) {
    return NextResponse.json(
      { message: "Missing order id." },
      { status: 400 },
    );
  }

  /*
   * Read the order back from WooCommerce so the emails reflect the stored order
   * (fulfillment meta, line items, addresses) rather than the webhook body.
   */
  const order = (await getWooOrderById(orderId)) as RawWooOrder | null;

  if (!order) {
    console.warn(`[webhook] Order ${orderId} could not be read.`);

    return NextResponse.json(
      { message: "Order not found." },
      { status: 404 },
    );
  }

  /*
   * Custom dispatch is idempotent: the dispatcher skips a custom shipped event
   * already recorded in `_babysecret_emails_sent`, so WooCommerce retrying the
   * same `order.updated` delivery cannot duplicate it. Canonical statuses
   * produce no Next.js message because FluentSMTP sends those.
   */
  await dispatchOrderStatusEmails(order);

  return NextResponse.json({ received: true, status: order.status });
}

/**
 * WooCommerce validates a webhook URL with a GET before enabling it. Read-only,
 * so it must never trigger email.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}