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
  categories?: { name: string }[];
  short_description?: string;
  is_in_stock?: boolean;
  is_purchasable?: boolean;
};

const storeApiUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL ?? "https://babysecret.com/wp-json/wc/store/v1";

function mapCategory(name?: string): ProductCategory {
  const value = name?.toLowerCase() ?? "";
  if (value.includes("bath") || value.includes("shower") || value.includes("soap")) return "Bath & Wash";
  if (value.includes("wipe")) return "Hygiene";
  return "Baby Care";
}

function mapWooProduct(product: WooProduct): Product {
  const minorUnit = product.prices.currency_minor_unit ?? 2;
  const price = Number(product.prices.price) / 10 ** minorUnit;
  const regularPrice = product.prices.regular_price ? Number(product.prices.regular_price) / 10 ** minorUnit : undefined;
  return { id: String(product.id), slug: product.slug, name: product.name.replace(/&#038;/g, "&"), category: mapCategory(product.categories?.[0]?.name), description: product.description?.replace(/<[^>]+>/g, "").trim() || product.short_description?.replace(/<[^>]+>/g, "").trim() || "Everyday care for delicate skin.", shortDescription: product.short_description?.replace(/<[^>]+>/g, "").trim(), sku: product.sku, regularPrice, price, currency: "NGN", image: product.images?.[0]?.src ?? featuredProducts[0].image, images: product.images?.map((image) => image.src), stockStatus: product.is_in_stock === false ? "out-of-stock" : "in-stock", purchasable: product.is_purchasable, badge: product.on_sale ? "Sales" : undefined };
}

type ProductQuery = { page?: number; perPage?: number; category?: string; search?: string; order?: "asc" | "desc"; orderby?: "date" | "price" | "popularity" };

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/\s*&\s*/g, "-and-").replace(/\s+/g, "-");
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams({ page: String(query.page ?? 1), per_page: String(query.perPage ?? 24), order: query.order ?? "desc", orderby: query.orderby ?? "date" });
  if (query.search) params.set("search", query.search);
  try {
    const response = await fetch(`${storeApiUrl}/products?${params.toString()}`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    const products = (await response.json()) as WooProduct[];
    const mapped = products.map(mapWooProduct);
    return query.category ? mapped.filter((product) => categorySlug(product.category) === query.category) : mapped;
  } catch {
    let products = [...featuredProducts];
    if (query.category) products = products.filter((product) => categorySlug(product.category) === query.category);
    if (query.search) { const needle = query.search.toLowerCase(); products = products.filter((product) => [product.name, product.category, product.description].some((value) => value.toLowerCase().includes(needle))); }
    if (query.orderby === "price") products.sort((a, b) => query.order === "asc" ? a.price - b.price : b.price - a.price);
    return products;
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
  return ["Baby Care", "Bath & Wash", "Hygiene"];
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
