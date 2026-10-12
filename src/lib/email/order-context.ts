import {
  metaValue,
  type RawWooOrder,
} from "@/lib/woocommerce-orders";
import type {
  FulfillmentSummary,
  OrderEmailContext,
  OrderEmailItem,
  PaymentState,
} from "@/lib/email/types";
import { DEFAULT_PICKUP_FEE } from "@/config/pickup";

/**
 * Builds the email view model from a WooCommerce order.
 *
 * This is the bridge between WooCommerce (the source of truth for order state)
 * and the email templates: fulfillment method, pickup details, carrier rate and
 * tracking are all read back from the order's own meta and addresses, so an
 * email can never disagree with what was actually stored at checkout.
 */

function addressLines(order: RawWooOrder): string[] {
  const address = order.shipping ?? order.billing;

  if (!address) return [];

  return [
    [address.address_1, address.address_2].filter(Boolean).join(", "),
    address.city,
    address.state,
    address.postcode,
    address.country,
  ]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
}

/**
 * Tracking URL, when a carrier tracking page is configured.
 *
 * Intentionally not hardcoded: each carrier exposes a different tracking page,
 * so the base URL comes from the environment and no link is shown when unset.
 */
function trackingUrl(trackingNumber?: string): string | undefined {
  const base = process.env.SHIPPING_TRACKING_BASE_URL;

  if (!base || !trackingNumber) return undefined;

  return `${base.replace(/\/$/, "")}/${encodeURIComponent(trackingNumber)}`;
}

function trackingNumber(order: RawWooOrder): string {
  return (
    metaValue(order.meta_data, "_babysecret_tship_tracking") ||
    metaValue(order.meta_data, "_babysecret_shipbubble_tracking") ||
    metaValue(order.meta_data, "_babysecret_shipping_tracking")
  );
}

/**
 * Derives the fulfillment summary (pickup vs delivery) from order meta.
 */
export function buildFulfillmentSummary(
  order: RawWooOrder,
): FulfillmentSummary {
  const method =
    metaValue(order.meta_data, "_babysecret_fulfillment_method") === "pickup"
      ? "pickup"
      : "delivery";

  if (method === "pickup") {
    const locationName = metaValue(
      order.meta_data,
      "_babysecret_pickup_location_name",
    );
    const address = metaValue(
      order.meta_data,
      "_babysecret_pickup_location_address",
    );
    const rawFee = Number(
      metaValue(order.meta_data, "_babysecret_pickup_fee"),
    );

    return {
      method: "pickup",
      locationName: locationName || undefined,
      addressLines: address ? [address] : [],
      amount: Number.isFinite(rawFee) ? rawFee : DEFAULT_PICKUP_FEE,
    };
  }

  const rawAmount = Number(
    metaValue(
      order.meta_data,
      `_babysecret_${shippingMetaPrefix()}_amount`,
    ),
  );

  return {
    method: "delivery",
    addressLines: addressLines(order),
    amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    carrier:
      metaValue(order.meta_data, `_babysecret_${shippingMetaPrefix()}_carrier`) ||
      undefined,
    service:
      metaValue(order.meta_data, `_babysecret_${shippingMetaPrefix()}_service`) ||
      undefined,
    trackingNumber: trackingNumber(order) || undefined,
    trackingUrl: trackingUrl(trackingNumber(order)),
  };
}

function shippingMetaPrefix(): string {
  return "tship";
}

/**
 * Payment state, derived from the WooCommerce status + paid flag.
 */
export function resolvePaymentState(order: RawWooOrder): PaymentState {
  switch (order.status) {
    case "processing":
    case "completed":
      return "paid";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    case "cancelled":
      return "failed";
    case "on-hold":
    case "pending":
      return "awaiting";
    default:
      return order.date_paid ? "paid" : "awaiting";
  }
}

/**
 * Full email context for a WooCommerce order.
 */
export function buildOrderEmailContext(
  order: RawWooOrder,
): OrderEmailContext {
  const fulfillment = buildFulfillmentSummary(order);

  const items: OrderEmailItem[] = (order.line_items ?? []).map((item) => ({
    name: item.name ?? "Item",
    quantity: Number(item.quantity ?? 1),
    total: Number(item.total ?? 0),
  }));

  const total = Number(order.total ?? 0);
  const subtotal = Math.max(0, total - (fulfillment.amount || 0));

  const customerName = [order.billing?.first_name, order.billing?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const reference = metaValue(order.meta_data, "_babysecret_paystack_reference");
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    orderNumber: order.number ?? String(order.id),
    reference,
    customerName: customerName || "Customer",
    customerEmail: order.billing?.email ?? "",
    items,
    subtotal,
    fulfillmentAmount: fulfillment.amount,
    total,
    currency: order.currency || "NGN",
    paymentMethod: order.payment_method_title || order.payment_method || "Bank Transfer",
    paymentState: resolvePaymentState(order),
    status: order.status,
    fulfillment,
    orderUrl: reference ? `${appUrl}/order-confirmation?reference=${encodeURIComponent(reference)}` : undefined,
    adminOrderUrl: process.env.WOOCOMMERCE_ADMIN_URL
      ? `${process.env.WOOCOMMERCE_ADMIN_URL.replace(/\/$/, "")}/post.php?post=${order.id}&action=edit`
      : undefined,
    bankTransfer: {
      payerName:
        metaValue(order.meta_data, "_babysecret_bank_payer_name") || undefined,
      transferReference:
        metaValue(order.meta_data, "_babysecret_bank_transfer_reference") ||
        undefined,
      confirmedAt:
        metaValue(order.meta_data, "_babysecret_bank_transfer_confirmed_at") ||
        undefined,
    },
  };
}