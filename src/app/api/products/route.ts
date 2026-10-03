import { NextResponse } from "next/server";

import { getProductList } from "@/services/product.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "featured";
  const category = searchParams.get("category") ?? "";

  const orderby = sort.startsWith("price") ? "price" : "date";

  const result = await getProductList({
    page,
    perPage: 24,
    search,
    category,
    orderby,
    order: sort === "price-asc" ? "asc" : "desc",
  });

  return NextResponse.json(result);
}
