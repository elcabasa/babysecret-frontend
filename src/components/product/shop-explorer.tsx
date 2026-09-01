"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { Product, ProductCategory } from "@/types/product";

type Props = {
  categories: ProductCategory[];
  initialProducts: Product[];
  initialTotalPages: number;
  initialTotalProducts: number;
  initialSearch?: string;
  initialSort?: string;
  initialCategory?: string;
};

export function ShopExplorer({
  categories,
  initialProducts,
  initialTotalPages,
  initialTotalProducts,
  initialSearch = "",
  initialSort = "featured",
  initialCategory = "",
}: Props) {
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalProducts, setTotalProducts] = useState(initialTotalProducts);

  const [isPending, startTransition] = useTransition();
  const initialized = useRef(false);

  const load = useCallback(() => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search.trim()) params.set("search", search.trim());
      if (sort !== "featured") params.set("sort", sort);
      if (category) params.set("category", category);

      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `/shop?${params.toString()}`
        );
      }

      try {
        const response = await fetch(`/api/products?${params.toString()}`);
        const data = await response.json();
        setProducts(data.products ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalProducts(data.totalProducts ?? 0);
      } catch {
        setProducts([]);
      }
    });
  }, [page, search, sort, category]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const debounce = setTimeout(load, 250);
    return () => clearTimeout(debounce);
  }, [load]);

  function applyCategory(next: string) {
    setCategory(next);
    setPage(1);
  }

  function applySort(next: string) {
    setSort(next);
    setPage(1);
  }

  function applyPage(next: number) {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
            Catalog
          </p>
          <h1 className="mt-3 text-5xl font-medium">Everyday care, made simple.</h1>
          <p className="mt-3 max-w-xl text-[#334f6d]">
            {totalProducts} Baby Secret essentials for bath time, moisturising,
            massage, and gentle clean-ups.
          </p>
        </div>

        <div className="glass-control flex items-center gap-2 rounded-full px-4 py-2 text-sm">
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => applySort(event.target.value)}
            className="bg-transparent font-medium outline-none"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <form
        className="glass-panel mb-8 flex max-w-xl gap-2 rounded-2xl p-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <label htmlFor="shop-search" className="sr-only">
          Search products
        </label>
        <input
          id="shop-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
        />
        <button className="rounded-full bg-[#3051a0] px-5 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => applyCategory("")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all shadow-xs ${
            category === ""
              ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd]"
              : "bg-white text-[#102a43] border border-[#d6e0f0] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
          }`}
        >
          All products
        </button>

        {categories.map((item) => {
          const isSelected = category === item.slug;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => applyCategory(item.slug)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all shadow-xs ${
                isSelected
                  ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd]"
                  : "bg-white text-[#102a43] border border-[#d6e0f0] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <div className={`transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        {products.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-[#102a43]">No products found</h2>
            <p className="mt-2 text-[#334f6d]">
              Try another search or browse a category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("");
                setPage(1);
              }}
              className="mt-5 inline-block font-semibold text-[#005dbd] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Product pagination"
          className="mt-12 flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => applyPage(page - 1)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              page <= 1
                ? "pointer-events-none opacity-40 border border-[#d6e0f0] bg-white text-[#62809e]"
                : "border border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
            }`}
          >
            Previous
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
            const number = index + 1;
            const isCurrent = number === page;
            return (
              <button
                key={number}
                type="button"
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => applyPage(number)}
                className={`min-w-10 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isCurrent
                    ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd] shadow-sm"
                    : "border border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
                }`}
              >
                {number}
              </button>
            );
          })}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => applyPage(page + 1)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              page >= totalPages
                ? "pointer-events-none opacity-40 border border-[#d6e0f0] bg-white text-[#62809e]"
                : "border border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
            }`}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
