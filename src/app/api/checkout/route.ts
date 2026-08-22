import { NextResponse } from "next/server";
import { createDemoOrder } from "@/services/order.service";
import type { CheckoutRequest } from "@/types/order";

export async function POST(request: Request) {
  try { const body = await request.json() as CheckoutRequest; if (!body.customer || !body.items?.length) return NextResponse.json({ message: "Your cart is empty or checkout details are incomplete." }, { status: 400 }); const order = await createDemoOrder(body); return NextResponse.json({ order, message: "Checkout is ready, but payment is not configured yet." }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Checkout could not be completed." }, { status: 400 }); }
}
