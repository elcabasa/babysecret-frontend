import type { CartItem } from "@/types/cart";

/**
 * How an order reaches the customer.
 *
 * - `delivery` is fulfilled by Terminal Africa (the only active provider).
 * - `pickup` is fulfilled by the customer collecting from a Baby Secret
 *   location; no carrier rate is involved.
 */
export type FulfillmentMethod = "delivery" | "pickup";

export interface CheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  /**
   * Nigerian LGA / Area, collected for local-address context only. Never
   * sent to Terminal as the delivery city — the Terminal-supported City /
   * Delivery Area owns the quote.
   */
  lga?: string;
  address: string;
  apartment?: string;
  zip: string;
  notes?: string;
  paymentMethod?: "paystack" | "flutterwave" | "bank_transfer";
}
export interface CheckoutDelivery {
  rateId: string;
  carrier: string;
  service?: string;
  amount: number;
}

/**
 * Pickup selection submitted by the browser.
 *
 * Only `locationId` is trusted as input — the server re-resolves the name,
 * address and fee from `src/config/pickup.ts` so a tampered payload can never
 * change what the customer is charged.
 */
export interface CheckoutPickup {
  locationId: string;
}
export interface CheckoutRequest {
  customer: CheckoutCustomer;
  items: CartItem[];
  fulfillmentMethod?: FulfillmentMethod;
  delivery?: CheckoutDelivery | null;
  pickup?: CheckoutPickup | null;
}
export interface OrderSummary {
  reference: string;
  status: "pending" | "demo";
  paymentStatus: "not-configured" | "pending" | "paid";
  customer: Pick<CheckoutCustomer, "firstName" | "lastName" | "email">;
  items: CartItem[];
  subtotal: number;
  fulfillmentMethod?: FulfillmentMethod;
  delivery?: { carrier: string; service?: string; amount: number } | null;
  pickup?: { locationName: string; address: string; fee: number } | null;
  total: number;
}