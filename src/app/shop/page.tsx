import { Header } from "@/components/layout/header";
import { ShopExplorer } from "@/components/product/shop-explorer";

import {
  getProductCategories,
  getProductList,
} from "@/services/product.service";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    q?: string;
    sort?: string;
    category?: string;
  }>;
}) {
  const values = await searchParams;

  const page = Math.max(1, Number(values.page ?? 1) || 1);
  const search = values.search ?? values.q ?? "";
  const sort = values.sort ?? "featured";
  const category = values.category ?? "";

  const orderby = sort.startsWith("price") ? "price" : "date";

  const [
    { products, totalPages, totalProducts },
    categories,
  ] = await Promise.all([
    getProductList({
      page,
      perPage: 24,
      search,
      category,
      orderby,
      order: sort === "price-asc" ? "asc" : "desc",
    }),
    getProductCategories(),
  ]);

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-[1200px]">
        <ShopExplorer
          categories={categories}
          initialProducts={products}
          initialTotalPages={totalPages}
          initialTotalProducts={totalProducts}
          initialSearch={search}
          initialSort={sort}
          initialCategory={category}
        />
      </div>
    </main>
  );
}
