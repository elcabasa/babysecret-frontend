export type ProductCategory = "Baby Care" | "Bath & Wash" | "Hygiene";

export interface Product {
  id: string;
  slug?: string;
  name: string;
  category: ProductCategory;
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
