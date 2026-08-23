export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  category: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  currency: "NGN";
  image: string;
  images?: string[];
  stockStatus?: "in-stock" | "out-of-stock" | "on-backorder";
  purchasable?: boolean;
  badge?: string;
}
