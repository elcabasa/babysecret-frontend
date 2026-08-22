import { NextResponse } from "next/server";
import { createDemoOrder, validateCheckoutItems } from "@/services/order.service";
import type { CheckoutRequest } from "@/types/order";

export async function POST(request: Request) {
  try { const body = await request.json() as CheckoutRequest; if (!body.customer || !body.items?.length) return NextResponse.json({ message: "Your cart is empty or checkout details are incomplete." }, { status: 400 }); const validation = await validateCheckoutItems(body.items); if (!validation.valid || validation.priceChanges.length) return NextResponse.json({ code: "cart-changed", message: "Your cart needs attention before checkout can continue.", unavailableItems: validation.unavailableItems, priceChanges: validation.priceChanges }, { status: 409 }); const order = await createDemoOrder(body); return NextResponse.json({ order, message: "Checkout is ready, but payment is not configured yet." }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Checkout could not be completed." }, { status: 400 }); }
}
