import { NextRequest, NextResponse } from "next/server";

import {
  getPaymentProvider,
  isSufficientPayment,
} from "@/services/payment/payment.service";
import { arrangeShipment } from "@/services/shipping/shipping.service";
import { checkCartStock } from "@/lib/woo-stock";
import { getWooOrderByReference } from "@/lib/woocommerce-orders";

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

    const transactionId = request.nextUrl.searchParams.get("transaction_id");

    if (!reference) {
      return NextResponse.json(
        {
          message: "Payment reference is missing.",
        },
        { status: 400 },
      );
    }

    // Get WooCommerce credentials
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

    // Verify the payment with the provider (Paystack/Flutterwave only —
    // bank transfer can never auto-verify and always fails this check).
    const paymentProvider = getPaymentProvider();

    const payment = await paymentProvider.verifyPayment(
      reference,
      transactionId || undefined,
    );

    // Create WooCommerce authentication
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    );

    // Find the WooCommerce order by EXACT reference match (WooCommerce
    // ignores meta_key/meta_value collection params, so the helper pages
    // and matches in code — never orders[0]).
    const order = await getWooOrderByReference(reference);

    if (!order) {
      throw new Error("No WooCommerce order was found for this payment.");
    }

    /*
     * Replay/idempotency: an already-paid order goes straight to
     * confirmation. No second shipment arrangement, no second status PUT —
     * a retried callback can never double-fulfill.
     */
    if (order.status === "processing" || order.status === "completed") {
      return NextResponse.redirect(
        new URL(
          `/order-confirmation?reference=${encodeURIComponent(reference)}`,
          request.url,
        ),
      );
    }

    /*
     * Amount enforcement: the provider-reported amount must cover the
     * authoritative WooCommerce order total, in NGN, for this reference.
     * An underpaid or wrong-currency transaction never marks the order paid.
     * The amount comes from the provider's verify API, never the browser.
     */
    const orderTotal = Number(order.total);

    if (
      !isSufficientPayment({
        verification: payment,
        expectedReference: reference,
        orderTotal,
        orderCurrency: order.currency ?? "NGN",
      })
    ) {
      return NextResponse.redirect(
        new URL(
          `/checkout?payment=failed&reference=${encodeURIComponent(reference)}`,
          request.url,
        ),
      );
    }

    /*
     * Stock re-check: items may have sold out between checkout and payment.
     * An order whose lines are no longer valid must never be marked paid or
     * fulfilled. (WooCommerce stays the inventory authority.)
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
      return NextResponse.redirect(
        new URL(
          `/checkout?payment=failed&reference=${encodeURIComponent(reference)}`,
          request.url,
        ),
      );
    }

    /*
     * Arrange the delivery with the logistics provider using the
     * rate held on the order, then surface it back to WooCommerce.
     *
     * Pickup orders have no carrier rate, so nothing is arranged for them —
     * a missing rate is not an error (requirement 8).
     */
    const fulfillmentMethod = metaValue(
      order.meta_data,
      "_babysecret_fulfillment_method",
    );

    const shippingRateId =
      fulfillmentMethod === "pickup"
        ? ""
        : metaValue(order.meta_data, "_babysecret_tship_rate_id") ||
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
    const updateResponse = await fetch(`${wooUrl}/orders/${order.id}`, {
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
    });

    await updateResponse.json();

    if (!updateResponse.ok) {
      // Status only: the response body can echo customer PII.
      console.error(
        `WooCommerce order update failed (HTTP ${updateResponse.status}).`,
      );

      throw new Error("Could not update the WooCommerce order.");
    }

    /*
     * The status change to processing lets WooCommerce + FluentSMTP send the
     * canonical payment-confirmation message. Next.js intentionally sends no
     * second copy here.
     */

    // Send customer to the confirmation page
    return NextResponse.redirect(
      new URL(
        `/order-confirmation?reference=${encodeURIComponent(reference)}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.redirect(
      new URL("/checkout?payment=verification-failed", request.url),
    );
  }
}
