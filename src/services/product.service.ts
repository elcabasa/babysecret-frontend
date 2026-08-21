import { featuredProducts } from "@/data/products";
import type { Product, ProductCategory } from "@/types/product";

type WooProduct = {
  id: number;
  name: string;
  on_sale: boolean;
  prices: { price: string; currency_minor_unit: number };
  images?: { src: string }[];
  categories?: { name: string }[];
  short_description?: string;
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
  return { id: String(product.id), name: product.name.replace(/&#038;/g, "&"), category: mapCategory(product.categories?.[0]?.name), description: product.short_description?.replace(/<[^>]+>/g, "").trim() || "Everyday care for delicate skin.", price: Number(product.prices.price) / 10 ** minorUnit, currency: "NGN", image: product.images?.[0]?.src ?? featuredProducts[0].image, badge: product.on_sale ? "Sales" : undefined };
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${storeApiUrl}/products?per_page=8&orderby=date`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    const products = (await response.json()) as WooProduct[];
    return products.length ? products.map(mapWooProduct) : featuredProducts;
  } catch {
    return featuredProducts;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  try {
    const response = await fetch(`${storeApiUrl}/products?per_page=24&search=${encodeURIComponent(normalizedQuery)}`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`WooCommerce returned ${response.status}`);
    const products = (await response.json()) as WooProduct[];
    return products.map(mapWooProduct);
  } catch {
    const needle = normalizedQuery.toLowerCase();
    return featuredProducts.filter((product) => [product.name, product.category, product.description].some((value) => value.toLowerCase().includes(needle)));
  }
}
