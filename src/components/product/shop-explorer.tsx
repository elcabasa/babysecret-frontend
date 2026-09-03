"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { CategoryFilter } from "@/components/product/category-filter";
import { Pagination } from "@/components/product/pagination";
import { ProductEmptyState } from "@/components/product/product-empty-state";
import { ProductGrid } from "@/components/product/product-grid";
import { ShopCatalogHeader } from "@/components/product/shop-catalog-header";
import { ShopSearchForm } from "@/components/product/shop-search-form";
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
        window.history.replaceState(null, "", `/shop?${params.toString()}`);
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

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setPage(1);
  };

  return (
    <div>
      <ShopCatalogHeader
        totalProducts={totalProducts}
        sort={sort}
        onSortChange={applySort}
      />

      <ShopSearchForm
        value={search}
        onChange={setSearch}
        onSubmit={() => setPage(1)}
      />

      <CategoryFilter
        categories={categories}
        selected={category}
        onSelect={applyCategory}
      />

      <div
        className={`transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}
      >
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <ProductEmptyState onClear={clearFilters} />
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={applyPage}
      />
    </div>
  );
}
