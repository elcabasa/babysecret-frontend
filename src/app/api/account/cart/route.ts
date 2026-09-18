import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCustomerById,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";
import { getProductById } from "@/services/product.service";
import type { CartItem } from "@/types/cart";

const CART_META_KEY = "babysecret_cart";

async function verifyItems(items: CartItem[]): Promise<CartItem[]> {
  const verified: CartItem[] = [];

  for (const item of items) {
    const product = await getProductById(item.productId);
    if (!product || product.purchasable === false) continue;

    verified.push({
      productId: product.id,
      slug: product.slug ?? item.slug,
      variantId: item.variantId,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: Math.max(1, item.quantity),
      stockStatus: product.stockStatus,
    });
  }

  return verified;
}

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

    let stored: CartItem[] = [];
    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) stored = parsed;
    } catch {
      return NextResponse.json({ items: [] });
    }

    const items = await verifyItems(stored);
    return NextResponse.json({ items });
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
        { status: 401 },
      );
    }

    const body = await request.json();
    const incoming = Array.isArray(body?.items)
      ? (body.items as CartItem[])
      : [];

    const items = await verifyItems(incoming);

    await updateCustomerMeta(session.user.id, [
      { key: CART_META_KEY, value: JSON.stringify(items) },
    ]);

    return NextResponse.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error("Save WooCommerce cart error:", error);
    return NextResponse.json(
      { message: "Could not save cart" },
      { status: 500 },
    );
  }
}
