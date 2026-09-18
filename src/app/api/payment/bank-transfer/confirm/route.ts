import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { message: "Payment reference is required." },
        { status: 400 },
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

    // Update order meta to mark as awaiting bank transfer verification
    const updateResponse = await fetch(`${wooUrl}/orders/${order.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "on-hold", // on-hold means awaiting payment
        meta_data: [
          { key: "_babysecret_bank_transfer_awaiting", value: "true" },
          { key: "_babysecret_bank_transfer_confirmed_at", value: new Date().toISOString() },
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