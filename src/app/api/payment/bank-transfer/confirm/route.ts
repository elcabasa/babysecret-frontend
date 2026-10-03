import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth as getServerSession } from "@/auth";
import { sendBankTransferSubmittedEmail } from "@/lib/email/order-emails";
import type { RawWooOrder } from "@/lib/woocommerce-orders";
import { getWooOrderByReference } from "@/lib/woocommerce-orders";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { checkCartStock } from "@/lib/woo-stock";

const confirmSchema = z.object({
  reference: z.string().min(1, "Payment reference is required."),
  payerName: z.string().trim().min(2, "Transfer/payer name is required."),
  transferReference: z.string().trim().min(3, "Transfer reference is required."),
  // Guest ownership proof: the billing email used at checkout. Signed-in
  // owners and admins don't need it; guests must supply the matching email.
  email: z.string().trim().email("Enter the email used for this order.").optional(),
});

/** Generic responses everywhere below: existence must not be enumerable. */
const NOT_FOUND = { message: "No order found for this reference." };
const FORBIDDEN = { message: "Could not submit confirmation." };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { message: firstIssue?.message ?? "Invalid confirmation details." },
        { status: 400 },
      );
    }

    const { reference, payerName, transferReference, email } = parsed.data;

    // Abuse backstop: confirmation is a state-changing, email-triggering
    // endpoint keyed by a reference that travels in URLs.
    const limit = checkRateLimit(
      requestKey(request, `bank-confirm:${reference}`),
      10,
      60 * 60 * 1000,
    );

    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    // Get WooCommerce credentials
    const wooUrl = process.env.WOOCOMMERCE_REST_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { message: "WooCommerce is not configured." },
        { status: 500 },
      );
    }

    // Create WooCommerce authentication
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    );

    // Find the WooCommerce order by EXACT reference match. (WooCommerce
    // ignores meta_key/meta_value collection params, so the lookup helper
    // pages and matches in code — a bogus reference resolves to null here,
    // never to somebody else's newest order.)
    const order = await getWooOrderByReference(reference);

    if (!order) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    /*
     * Ownership: the order must belong to the caller.
     * - Signed-in WooCommerce customer matching order.customer_id → allowed.
     * - Admins → allowed.
     * - Guest orders (customer_id 0) → the caller must also know the order's
     *   billing email, so a bare leaked/guessed reference is not enough.
     * Anything else is rejected with the same generic message used for
     * other failures, revealing nothing about the order.
     */
    const session = await getServerSession();
    const sessionCustomerId = Number(session?.user?.id);
    const sessionRole = session?.user?.role;
    const orderCustomerId = Number(order.customer_id ?? 0);
    const orderEmail = String(order.billing?.email ?? "")
      .toLowerCase()
      .trim();

    const isAdmin = sessionRole === "admin";
    const isOwner =
      Number.isFinite(sessionCustomerId) &&
      sessionCustomerId > 0 &&
      orderCustomerId > 0 &&
      sessionCustomerId === orderCustomerId;
    const guestProof =
      orderCustomerId === 0 &&
      orderEmail.length > 0 &&
      typeof email === "string" &&
      email.toLowerCase().trim() === orderEmail;

    if (!isAdmin && !isOwner && !guestProof) {
      return NextResponse.json(FORBIDDEN, { status: 403 });
    }

    // Check if order is already paid or processing
    if (order.status === "processing" || order.status === "completed") {
      return NextResponse.json(
        { message: "This order has already been processed." },
        { status: 409 },
      );
    }

    /*
     * Repeated confirmation is idempotent: the claim is already recorded,
     * so acknowledge without re-flipping status or re-mailing the admin.
     */
    const alreadyClaimed = (order.meta_data ?? []).some(
      (meta: { key?: unknown; value?: unknown }) =>
        meta.key === "_babysecret_bank_transfer_awaiting" &&
        meta.value === "true",
    );

    if (alreadyClaimed) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    /*
     * Stock re-check: items may have sold out while the transfer was
     * pending. Never advance an order whose lines are no longer valid.
     */
    const orderLines = Array.isArray(order.line_items) ? order.line_items : [];
    const stockReport = await checkCartStock(
      orderLines.map((line: { product_id?: unknown; variation_id?: unknown; quantity?: unknown; name?: unknown }) => ({
        productId: String(line.product_id ?? ""),
        variantId:
          line.variation_id === undefined || line.variation_id === null || line.variation_id === 0
            ? undefined
            : String(line.variation_id),
        quantity:
          typeof line.quantity === "number" && line.quantity > 0
            ? line.quantity
            : 1,
        fallbackName:
          typeof line.name === "string" ? line.name : undefined,
      })),
    );

    if (!stockReport.valid) {
      return NextResponse.json(
        {
          message:
            "Some items in this order are no longer available. Please contact support.",
        },
        { status: 409 },
      );
    }

    /*
     * Record the customer's transfer claim and keep the order pending.
     * Status "on-hold" means awaiting payment verification — the order is
     * deliberately NOT marked as paid here. An admin verifies the transfer
     * (payer name + transfer reference below) before processing.
     */
    const updateResponse = await fetch(`${wooUrl}/orders/${order.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "on-hold",
        set_paid: false,
        meta_data: [
          { key: "_babysecret_bank_transfer_awaiting", value: "true" },
          {
            key: "_babysecret_bank_transfer_confirmed_at",
            value: new Date().toISOString(),
          },
          { key: "_babysecret_bank_payer_name", value: payerName },
          {
            key: "_babysecret_bank_transfer_reference",
            value: transferReference,
          },
        ],
      }),
    });

    const updatedOrder = (await updateResponse.json()) as RawWooOrder & {
      message?: string;
    };

    if (!updateResponse.ok) {
      // Status only: the response body can echo customer PII.
      console.error(
        `WooCommerce order update failed (HTTP ${updateResponse.status}): ${updatedOrder?.message ?? "no message"}`,
      );

      return NextResponse.json(
        { message: "Could not update the order." },
        { status: 500 },
      );
    }

    /*
     * Notify the store admin that a transfer was claimed.
     *
     * The order stays unpaid/on-hold — the admin verifies the funds and moves
     * it to Processing. WooCommerce + FluentSMTP then sends the customer's
     * canonical Processing Order email. A mail failure is logged, never
     * surfaced, and cannot fail the confirmation itself.
     */
    try {
      await sendBankTransferSubmittedEmail(updatedOrder);
    } catch (emailError) {
      console.error("Bank transfer notification error:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bank transfer confirmation error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while confirming transfer.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
