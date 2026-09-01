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

const FALLBACK_IMAGE = "/logo.png";

function stripHtml(value?: string): string | undefined {
  return value?.replace(/<[^>]+>/g, "").trim() || undefined;
}

function mapWooProduct(product: WooProduct): Product {
  const minorUnit = product.prices.currency_minor_unit ?? 2;
  const price = Number(product.prices.price) / 10 ** minorUnit;
  const regularPrice = product.prices.regular_price ? Number(product.prices.regular_price) / 10 ** minorUnit : undefined;
  return { id: String(product.id), slug: product.slug, name: product.name.replace(/&#038;/g, "&"), category: product.categories?.[0]?.slug ?? "", description: stripHtml(product.description) ?? stripHtml(product.short_description) ?? "", shortDescription: stripHtml(product.short_description), sku: product.sku, regularPrice, price, currency: "NGN", image: product.images?.[0]?.src ?? FALLBACK_IMAGE, images: product.images?.map((image) => image.src), stockStatus: product.is_in_stock === false ? "out-of-stock" : "in-stock", purchasable: product.is_purchasable, badge: product.on_sale ? "Sales" : undefined };
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

  const response = await fetch(
    `${storeApiUrl}/products?${params.toString()}`,
    {
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`WooCommerce returned ${response.status}`);
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
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return getProducts({ perPage: 8, orderby: "date" });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const response = await fetch(`${storeApiUrl}/products?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  if (!response.ok) return null;
  const products = (await response.json()) as WooProduct[];
  return products[0] ? mapWooProduct(products[0]) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const response = await fetch(`${storeApiUrl}/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
  if (!response.ok) return null;
  return mapWooProduct((await response.json()) as WooProduct);
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const response = await fetch(
    `${storeApiUrl}/products/categories?per_page=100&hide_empty=true`,
    {
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`WooCommerce returned ${response.status}`);
  }

  const categories = (await response.json()) as {
    id: number;
    name: string;
    slug: string;
    count: number;
    image?: {
      src?: string;
    };
  }[];

  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category.count,
      image: category.image?.src,
    }))
    .filter((category) => (category.count ?? 0) > 0);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return getProducts({ perPage: 24, search: normalizedQuery });
}