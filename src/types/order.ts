import type { CartItem } from "@/types/cart";

export interface CheckoutCustomer { firstName: string; lastName: string; email: string; phone: string; country: string; state: string; city: string; address: string; apartment?: string; notes?: string; }
export interface CheckoutRequest { customer: CheckoutCustomer; items: CartItem[]; }
export interface OrderSummary { reference: string; status: "pending" | "demo"; paymentStatus: "not-configured" | "pending" | "paid"; customer: Pick<CheckoutCustomer, "firstName" | "lastName" | "email">; items: CartItem[]; subtotal: number; total: number; }
