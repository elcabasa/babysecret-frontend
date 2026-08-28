import type { CartItem } from "@/types/cart";

export interface CheckoutCustomer { firstName: string; lastName: string; email: string; phone: string; country: string; state: string; city: string; address: string; apartment?: string; notes?: string; }
export interface CheckoutDelivery { rateId: string; carrier: string; service?: string; amount: number; }
export interface CheckoutRequest { customer: CheckoutCustomer; items: CartItem[]; delivery?: CheckoutDelivery | null; }
export interface OrderSummary { reference: string; status: "pending" | "demo"; paymentStatus: "not-configured" | "pending" | "paid"; customer: Pick<CheckoutCustomer, "firstName" | "lastName" | "email">; items: CartItem[]; subtotal: number; delivery?: { carrier: string; service?: string; amount: number } | null; total: number; }
