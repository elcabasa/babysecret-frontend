import { renderEmail } from "@/lib/email/layout";
import { formatPrice } from "@/data/products";
import type { RenderedEmail } from "@/lib/email/types";

/**
 * Admin delivery-assistance notification.
 *
 * This is a customer-service request, not an order. It must never be confused
 * with a shipping quote, a shipping charge, or an order-status change: the
 * body states that explicitly. It never contains credentials of any kind —
 * only the customer's contact details, destination, and cart.
 */

export interface DeliveryAssistanceEmailItem {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  /** Authoritative catalog price when the product could be resolved. */
  unitPrice?: number;
}

export interface DeliveryAssistanceEmailContext {
  reference: string;
  requestId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  address: string;
  apartment?: string;
  country: string;
  note?: string;
  items: DeliveryAssistanceEmailItem[];
  /** Catalog subtotal for resolvable products only. */
  subtotal?: number;
  submittedAtLabel: string;
}

export function deliveryAssistanceEmail(
  context: DeliveryAssistanceEmailContext,
): RenderedEmail {
  const customerName = `${context.firstName} ${context.lastName}`.trim();

  const itemLines = context.items.map((item) => {
    const variant = item.variantId ? ` (variant ${item.variantId})` : "";
    const priced =
      item.unitPrice !== undefined
        ? ` — ${formatPrice(item.unitPrice)} each, ${formatPrice(item.unitPrice * item.quantity)} total`
        : " — catalog price unavailable";

    return `• ${item.name}${variant} × ${item.quantity}${priced}`;
  });

  const rendered = renderEmail({
    preheader: `Delivery assistance request ${context.reference} from ${customerName}.`,
    title: "Delivery assistance requested",
    body: [
      `Customer:\n${customerName}`,
      `Email:\n${context.email}`,
      `Phone:\n${context.phone}`,
      `Destination:\n${context.state}, ${context.city}`,
      `Address:\n${context.address}`,
      ...(context.apartment
        ? [`Apartment/Landmark:\n${context.apartment}`]
        : []),
      ...(context.note ? [`Note:\n${context.note}`] : []),
      `Cart:\n${itemLines.join("\n")}`,
      context.subtotal !== undefined
        ? `Cart value:\n${formatPrice(context.subtotal)} (resolvable catalog products only)`
        : "Cart value:\nunavailable",
      `Request reference:\n${context.reference}`,
      `Created:\n${context.submittedAtLabel}`,
      `Request ID:\n${context.requestId}`,
      "Important: this is an assistance request only. No order was created, no shipping fee was charged, and nothing was marked paid, shipped, or confirmed.",
    ],
    footerNote:
      "Reply to the customer directly to share the available delivery option and cost.",
  });

  return {
    ...rendered,
    subject: "Delivery Assistance Request — Baby Secret",
  };
}
