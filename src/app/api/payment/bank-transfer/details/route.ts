import { NextRequest, NextResponse } from "next/server";

import { getBankDetails } from "@/config/bank";
import { getWooOrderByReference } from "@/lib/woocommerce-orders";

/**
 * Read-only lookup backing the bank-transfer instructions page.
 *
 * WHY THIS EXISTS
 * ---------------
 * The awaiting-payment page used to render the receiving account number and the
 * amount straight out of the URL query string. Query strings are fully
 * client-controlled, so anyone could craft a link that made the real storefront
 * display a different account number (redirected payments) or a different
 * amount. Both now come from trusted server-side sources:
 *
 *   bank details → MONIEPOINT_* environment variables (src/config/bank.ts)
 *   amount       → the stored WooCommerce order total, never a posted number
 *
 * The only thing the URL carries is the opaque order reference.
 *
 * Nothing customer-identifying is returned: no name, email, phone or address.
 * The response is limited to what the customer already needs to make a
 * transfer.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim();

  if (!reference) {
    return NextResponse.json(
      { message: "Missing order reference." },
      { status: 400 },
    );
  }

  // Shape-check before it reaches WooCommerce's query string.
  if (!/^babysecret-[a-z0-9-]{4,64}$/i.test(reference)) {
    return NextResponse.json(
      { message: "Invalid order reference." },
      { status: 400 },
    );
  }

  const order = await getWooOrderByReference(reference);

  if (!order) {
    return NextResponse.json(
      { message: "Order not found." },
      { status: 404 },
    );
  }

  /*
   * Fail closed: without configured account details we must not show the
   * instructions at all, rather than render blanks a customer could guess past.
   */
  let bankDetails;

  try {
    bankDetails = getBankDetails();
  } catch (error) {
    console.error(
      "[bank-transfer/details] Bank details are not configured:",
      error instanceof Error ? error.message : "unknown error",
    );

    return NextResponse.json(
      { message: "Bank transfer is currently unavailable." },
      { status: 503 },
    );
  }

  const amount = Number.parseFloat(order.total);

  if (!Number.isFinite(amount)) {
    console.error(
      `[bank-transfer/details] Order ${order.id} has a non-numeric total.`,
    );

    return NextResponse.json(
      { message: "Could not resolve the order total." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    reference,
    amount,
    currency: order.currency,
    orderStatus: order.status,
    paid: Boolean(order.date_paid),
    bankDetails,
  });
}