export type ProductCategory = "Baby Care" | "Bath & Wash" | "Hygiene";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  currency: "NGN";
  image: string;
  badge?: string;
}
