import { NextResponse } from "next/server";
import { getProductList } from "@/services/product.service";

export async function GET() {
  try {
    // Use WooCommerce's live product records and prices. The routine builder
    // must never fall back to manually entered product names or prices.
    const result = await getProductList({
      page: 1,
      perPage: 100,
      orderby: "date",
      order: "desc",
    });

    return NextResponse.json(
      { products: result.products },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Routine products are temporarily unavailable." },
      { status: 502 },
    );
  }
}
