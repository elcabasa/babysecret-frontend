import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/components/product/product-card";
import { getProductList } from "@/services/product.service";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await params;
  const values = await searchParams;
  const requestedPage = Math.max(1, Number(values.page ?? 1) || 1);

  let result = await getProductList({
    page: requestedPage,
    perPage: 24,
    category,
  });

  // If someone opens a stale page URL after products have been removed,
  // fall back to the last available page instead of showing a false empty state.
  if (result.totalPages > 0 && requestedPage > result.totalPages) {
    result = await getProductList({
      page: result.totalPages,
      perPage: 24,
      category,
    });
  }

  const title = category.replaceAll("-", " ").replace(/\band\b/g, "&");
  const currentPage = result.page;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-4 pb-16 pt-28 sm:px-10 sm:pb-20 sm:pt-36">
      <Header />

      <div className="mx-auto max-w-[1200px]">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005dbd] transition hover:underline"
        >
          <ArrowLeft size={16} /> Back to Catalog
        </Link>

        <h1 className="mt-5 text-3xl font-semibold capitalize text-[#102a43] sm:mt-6 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#334f6d] sm:text-lg">
          Care selected for your little one&apos;s everyday routine.
        </p>
        <p className="mt-3 text-xs text-[#62809e] sm:text-sm">
          {result.totalProducts} {result.totalProducts === 1 ? "product" : "products"}
        </p>

        {result.products.length ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-4">
              {result.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {result.totalPages > 1 && (
              <nav
                aria-label="Category product pagination"
                className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:mt-12"
              >
                {currentPage > 1 && (
                  <Link
                    href={`?page=${currentPage - 1}`}
                    className="rounded-full border border-[#d6e0f0] bg-white px-4 py-2 text-sm font-medium text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd]"
                  >
                    Previous
                  </Link>
                )}
                {Array.from({ length: result.totalPages }, (_, index) => index + 1)
                  .filter((number) =>
                    number === 1 ||
                    number === result.totalPages ||
                    Math.abs(number - currentPage) <= 1
                  )
                  .map((number, index, visiblePages) => (
                    <span key={number} className="contents">
                      {index > 0 && number - visiblePages[index - 1] > 1 && (
                        <span className="px-1 text-sm text-[#62809e]" aria-hidden="true">
                          …
                        </span>
                      )}
                      <Link
                        href={number === 1 ? "?" : `?page=${number}`}
                        aria-current={number === currentPage ? "page" : undefined}
                        className={`min-w-10 rounded-full border px-4 py-2 text-center text-sm font-medium transition ${
                          number === currentPage
                            ? "border-[#005dbd] bg-[#005dbd] text-white"
                            : "border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd]"
                        }`}
                      >
                        {number}
                      </Link>
                    </span>
                  ))}
                {currentPage < result.totalPages && (
                  <Link
                    href={`?page=${currentPage + 1}`}
                    className="rounded-full border border-[#d6e0f0] bg-white px-4 py-2 text-sm font-medium text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd]"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="glass-panel mt-8 rounded-2xl p-8 text-center sm:mt-10">
            <h2 className="text-xl font-semibold text-[#102a43]">
              No products found
            </h2>
            <p className="mt-2 text-[#334f6d]">
              This category currently has no available products.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-[#005dbd] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004d9c]"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
