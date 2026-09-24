import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const confirmSchema = z.object({
  reference: z.string().min(1, "Payment reference is required."),
  payerName: z.string().trim().min(2, "Transfer/payer name is required."),
  transferReference: z.string().trim().min(3, "Transfer reference is required."),
});

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

    const { reference, payerName, transferReference } = parsed.data;

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

    // Find the WooCommerce order using the bank transfer reference
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

    if (!ordersResponse.ok) {
      console.error("WooCommerce order lookup error:", orders);

      return NextResponse.json(
        { message: "Could not find the order." },
        { status: 500 },
      );
    }

    const order = orders[0];

    if (!order) {
      return NextResponse.json(
        { message: "No order found for this reference." },
        { status: 404 },
      );
    }

    // Check if order is already paid or processing
    if (order.status === "processing" || order.status === "completed") {
      return NextResponse.json(
        { message: "This order has already been processed." },
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

    const updatedOrder = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("WooCommerce update error:", updatedOrder);

      return NextResponse.json(
        { message: "Could not update the order." },
        { status: 500 },
      );
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
