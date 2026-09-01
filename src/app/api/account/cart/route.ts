import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCustomerById,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";
import type { CartItem } from "@/types/cart";

const CART_META_KEY = "babysecret_cart";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] });
    }

    const customer = await getCustomerById(session.user.id);
    if (!customer) {
      return NextResponse.json({ items: [] });
    }

    const raw = getCustomerMeta(customer, CART_META_KEY);
    if (!raw) {
      return NextResponse.json({ items: [] });
    }

    try {
      const items = JSON.parse(raw) as CartItem[];
      return NextResponse.json({ items: Array.isArray(items) ? items : [] });
    } catch {
      return NextResponse.json({ items: [] });
    }
  } catch (error) {
    console.error("Fetch WooCommerce cart error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? (body.items as CartItem[]) : [];

    await updateCustomerMeta(session.user.id, [
      { key: CART_META_KEY, value: JSON.stringify(items) },
    ]);

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error("Save WooCommerce cart error:", error);
    return NextResponse.json(
      { message: "Could not save cart" },
      { status: 500 }
    );
  }
}
