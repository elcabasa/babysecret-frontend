import { getProductById } from "@/services/product.service";
import type { CheckoutRequest, OrderSummary } from "@/types/order";

export async function validateCheckoutItems(items: CheckoutRequest["items"]) {
  const unavailableItems = []; const priceChanges = []; const updatedItems = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (!product || product.stockStatus === "out-of-stock" || product.purchasable === false) { unavailableItems.push(item); continue; }
    const updated = { ...item, slug: product.slug ?? item.slug, name: product.name, image: product.image, price: product.price };
    updatedItems.push(updated); if (updated.price !== item.price) priceChanges.push({ before: item, after: updated });
  }
  return { valid: unavailableItems.length === 0, unavailableItems, updatedItems, priceChanges };
}

export async function createDemoOrder(input: CheckoutRequest): Promise<OrderSummary> {
  const validation = await validateCheckoutItems(input.items); if (!validation.valid) throw new Error("One or more products are unavailable.");
  const subtotal = validation.updatedItems.reduce((total, item) => total + item.price * item.quantity, 0); const reference = `BS-${Date.now().toString(36).toUpperCase()}`;
  return { reference, status: "demo", paymentStatus: "not-configured", customer: { firstName: input.customer.firstName, lastName: input.customer.lastName, email: input.customer.email }, items: validation.updatedItems, subtotal, total: subtotal };
}
