import { featuredProducts } from "@/data/products";
import type { Product, ProductCategory } from "@/types/product";

type WooProduct = {
  id: number;
  slug: string;
  name: string;
  on_sale: boolean;
  sku?: string;
  description?: string;
  prices: { price: string; regular_price?: string; sale_price?: string; currency_code?: string; currency_minor_unit: number };
  images?: { src: string }[];
  categories?: { id?: number; name: string; slug?: string }[];
  short_description?: string;
  is_in_stock?: boolean;
  is_purchasable?: boolean;
};

const storeApiUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL ?? "https://babysecret.com/wp-json/wc/store/v1";



function mapWooProduct(product: WooProduct): Product {
  const minorUnit = product.prices.currency_minor_unit ?? 2;
  const price = Number(product.prices.price) / 10 ** minorUnit;
  const regularPrice = product.prices.regular_price ? Number(product.prices.regular_price) / 10 ** minorUnit : undefined;
  return { id: String(product.id), slug: product.slug, name: product.name.replace(/&#038;/g, "&"), category: product.categories?.[0]?.slug ?? "", description: product.description?.replace(/<[^>]+>/g, "").trim() || product.short_description?.replace(/<[^>]+>/g, "").trim() || "Everyday care for delicate skin.", shortDescription: product.short_description?.replace(/<[^>]+>/g, "").trim(), sku: product.sku, regularPrice, price, currency: "NGN", image: product.images?.[0]?.src ?? featuredProducts[0].image, images: product.images?.map((image) => image.src), stockStatus: product.is_in_stock === false ? "out-of-stock" : "in-stock", purchasable: product.is_purchasable, badge: product.on_sale ? "Sales" : undefined };
}

type ProductQuery = { page?: number; perPage?: number; category?: string; search?: string; order?: "asc" | "desc"; orderby?: "date" | "price" | "popularity" };
export interface ProductListResponse { products: Product[]; page: number; totalPages: number; totalProducts: number; }

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/\s*&\s*/g, "-and-").replace(/\s+/g, "-");
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  return (await getProductList(query)).products;
}

export async function getProductList(
  query: ProductQuery = {}
): Promise<ProductListResponse> {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 24;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order: query.order ?? "desc",
    orderby: query.orderby ?? "date",
  });

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  try {
    const response = await fetch(
      `${storeApiUrl}/products?${params.toString()}`,
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `WooCommerce returned ${response.status}`
      );
    }

    const products = (await response.json()) as WooProduct[];

    const mapped = products.map(mapWooProduct);

    const filteredProducts = query.category
      ? mapped.filter(
          (product) =>
            categorySlug(product.category) === query.category
        )
      : mapped;

    return {
      products: filteredProducts,
      page,
      totalPages: Number(
        response.headers.get("X-WP-TotalPages") ?? 1
      ),
      totalProducts: Number(
        response.headers.get("X-WP-Total") ??
          filteredProducts.length
      ),
    };
  } catch {
    let products = [...featuredProducts];

    if (query.category) {
      products = products.filter(
        (product) =>
          categorySlug(product.category) === query.category
      );
    }

    if (query.search) {
      const needle = query.search.toLowerCase().trim();

      products = products.filter((product) =>
        [
          product.name,
          product.category,
          product.description,
        ].some((value) =>
          value.toLowerCase().includes(needle)
        )
      );
    }

    if (query.orderby === "price") {
      products.sort((a, b) =>
        query.order === "asc"
          ? a.price - b.price
          : b.price - a.price
      );
    }

    const start = (page - 1) * perPage;

    return {
      products: products.slice(start, start + perPage),
      page,
      totalPages: Math.max(
        1,
        Math.ceil(products.length / perPage)
      ),
      totalProducts: products.length,
    };
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts({ perPage: 8, orderby: "date" });
  return products.length ? products : featuredProducts;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${storeApiUrl}/products?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    const products = (await response.json()) as WooProduct[];
    return products[0] ? mapWooProduct(products[0]) : null;
  } catch {
    return featuredProducts.find((product) => (product.slug ?? product.id) === slug) ?? null;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${storeApiUrl}/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    return mapWooProduct((await response.json()) as WooProduct);
  } catch {
    return featuredProducts.find((product) => product.id === id) ?? null;
  }
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  try {
    const response = await fetch(`${storeApiUrl}/products/categories?per_page=100&hide_empty=true`, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    return (await response.json() as { id: number; name: string; slug: string; count: number; image?: { src?: string } }[]).map((category) => ({ id: String(category.id), name: category.name, slug: category.slug, count: category.count, image: category.image?.src })).filter((category) => (category.count ?? 0) > 0);
  } catch {
    return ["Baby Care", "Bath & Wash", "Hygiene"].map((name) => ({ id: name, name, slug: categorySlug(name) }));
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  try {
    return await getProducts({ perPage: 24, search: normalizedQuery });
  } catch {
    const needle = normalizedQuery.toLowerCase();
    return featuredProducts.filter((product) => [product.name, product.category, product.description].some((value) => value.toLowerCase().includes(needle)));
  }
}
