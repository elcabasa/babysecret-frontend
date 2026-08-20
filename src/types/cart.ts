export interface CartItem {
  productId: string;
  slug: string;
  variantId?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type CartItemInput = Omit<CartItem, "quantity"> & { quantity?: number };
