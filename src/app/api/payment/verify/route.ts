import { NextRequest, NextResponse } from "next/server";

import { getPaymentProvider } from "@/services/payment/payment.service";
import { arrangeShipment } from "@/services/shipping/shipping.service";

type WooOrderMeta = { key: string; value: unknown };

function metaValue(meta?: WooOrderMeta[], key?: string): string {
  return meta?.find((entry) => entry.key === key)?.value?.toString() ?? "";
}

export async function GET(request: NextRequest) {
  try {
    // Get the payment reference from Paystack
    const reference =
  request.nextUrl.searchParams.get("reference") ||
  request.nextUrl.searchParams.get("tx_ref");

const transactionId =
  request.nextUrl.searchParams.get("transaction_id");

    if (!reference) {
      return NextResponse.json(
        {
          message: "Payment reference is missing.",
        },
        { status: 400 }
      );
    }

    // Get WooCommerce credentials
    const wooUrl = process.env.WOOCOMMERCE_REST_URL;
    const consumerKey =
      process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          message: "WooCommerce is not configured.",
        },
        { status: 500 }
      );
    }

    // Verify the payment with Paystack
    const paymentProvider = getPaymentProvider();

   const payment =
  await paymentProvider.verifyPayment(
    reference,
    transactionId || undefined
  );

    // If payment was not successful
    if (!payment.verified) {
      return NextResponse.redirect(
        new URL(
          `/checkout?payment=failed&reference=${encodeURIComponent(
            reference
          )}`,
          request.url
        )
      );
    }

    // Create WooCommerce authentication
    const auth = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    // Find the WooCommerce order using the Paystack reference
    const ordersResponse = await fetch(
      `${wooUrl}/orders?meta_key=_babysecret_paystack_reference&meta_value=${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const orders = await ordersResponse.json();

    if (!ordersResponse.ok) {
      console.error(
        "WooCommerce order lookup error:",
        orders
      );

      throw new Error(
        "Could not find the WooCommerce order."
      );
    }

    const order = orders[0];

    if (!order) {
      throw new Error(
        "No WooCommerce order was found for this payment."
      );
    }

    /*
     * Arrange the delivery with the logistics provider using the
     * rate held on the order, then surface it back to WooCommerce.
     */
    const shippingRateId =
      metaValue(order.meta_data, "_babysecret_tship_rate_id") ||
      metaValue(order.meta_data, "_babysecret_shipbubble_rate_id") ||
      metaValue(order.meta_data, "_babysecret_shipping_rate_id");

    let shipmentId = "";
    let trackingNumber = "";

    if (shippingRateId) {
      try {
        const arrangement = await arrangeShipment({
          rateId: shippingRateId,
          metadata: { store_order_reference: reference },
        });

        shipmentId = arrangement.shipmentId;
        trackingNumber = arrangement.trackingNumber ?? "";
      } catch (error) {
        console.error("Shipment arrangement error:", error);
      }
    }

    // Update the WooCommerce order
    const updateResponse = await fetch(
      `${wooUrl}/orders/${order.id}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          status: "processing",
          transaction_id: reference,
          set_paid: true,
          meta_data: [
            ...(shipmentId
              ? [{ key: "_babysecret_tship_shipment_id", value: shipmentId }]
              : []),
            ...(trackingNumber
              ? [{ key: "_babysecret_tship_tracking", value: trackingNumber }]
              : []),
          ],
        }),
      }
    );

    const updatedOrder =
      await updateResponse.json();

    if (!updateResponse.ok) {
      console.error(
        "WooCommerce update error:",
        updatedOrder
      );

      throw new Error(
        "Could not update the WooCommerce order."
      );
    }

    // Send customer to the confirmation page
    return NextResponse.redirect(
      new URL(
        `/order-confirmation?reference=${encodeURIComponent(
          reference
        )}`,
        request.url
      )
    );
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/checkout?payment=verification-failed",
        request.url
      )
    );
  }
}