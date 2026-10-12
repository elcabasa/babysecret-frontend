/**
 * Shared shapes for Baby Secret transactional emails.
 *
 * `OrderEmailContext` is the single view model every template renders, so a
 * product name, total or pickup location looks the same in every email and in
 * both customer/admin variants.
 */

export type PaymentState = "paid" | "awaiting" | "failed" | "refunded";

export interface OrderEmailItem {
  name: string;
  quantity: number;
  /** Line total in the order currency (already includes quantity). */
  total: number;
}

/**
 * How the order reaches the customer, flattened for rendering.
 */
export interface FulfillmentSummary {
  method: "delivery" | "pickup";
  /** Pickup point name (pickup only). */
  locationName?: string;
  /** Address lines — delivery address, or the pickup point address. */
  addressLines: string[];
  /** Fee charged: carrier rate for delivery, configured fee for pickup. */
  amount: number;
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface OrderEmailContext {
  /** Human-facing WooCommerce order number. */
  orderNumber: string;
  /** App-side payment reference. */
  reference: string;
  customerName: string;
  customerEmail: string;
  items: OrderEmailItem[];
  subtotal: number;
  fulfillmentAmount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentState: PaymentState;
  status: string;
  fulfillment: FulfillmentSummary;
  /** Receiving account shown only in custom bank-transfer instructions. */
  bankAccount?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  /** Link the customer can use to follow the order. */
  orderUrl?: string;
  /** Admin-only deep link into the WooCommerce order. */
  adminOrderUrl?: string;
  /** Bank transfer context, present only for bank-transfer orders. */
  bankTransfer?: {
    payerName?: string;
    transferReference?: string;
    confirmedAt?: string;
  };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}