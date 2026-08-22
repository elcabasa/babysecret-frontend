import type { Product } from "@/types/product";

const productImages = {
  lotion: "https://www.figma.com/api/mcp/asset/ce36a480-38a9-468d-938f-fb7784642d74.png",
  bath: "https://www.figma.com/api/mcp/asset/2d7d7dcf-47dd-4138-9033-6bff1be492d7.png",
  care: "https://www.figma.com/api/mcp/asset/ee47d358-db2e-4a16-8b37-e0415b6834ea.png",
};

export const featuredProducts: Product[] = [
  { id: "lotion-400", slug: "lotion-400", name: "Babysecret Lotion 400ml", category: "Baby Care", description: "Gentle everyday moisturiser for soft skin.", price: 6000, currency: "NGN", image: productImages.lotion, badge: "Sales" },
  { id: "lotion-200", slug: "lotion-200", name: "Babysecret Lotion 200ml", category: "Baby Care", description: "Gentle everyday moisturiser for soft skin.", price: 3000, currency: "NGN", image: productImages.lotion, badge: "Sales" },
  { id: "bath-1000", slug: "bath-1000", name: "Babysecret Bath 1000ml", category: "Bath & Wash", description: "Gentle cleanser for everyday bath time.", price: 8500, currency: "NGN", image: productImages.bath, badge: "Sales" },
  { id: "bath-500", slug: "bath-500", name: "Babysecret Bath 500ml", category: "Bath & Wash", description: "Gentle cleanser for everyday bath time.", price: 4500, currency: "NGN", image: productImages.bath, badge: "Sales" },
  { id: "oil-120", slug: "oil-120", name: "Babysecret Oil 120ml", category: "Baby Care", description: "Nourishing oil for soft, smooth skin.", price: 2500, currency: "NGN", image: productImages.care, badge: "Sales" },
  { id: "olive-oil", slug: "olive-oil", name: "Babysecret Olive Oil", category: "Baby Care", description: "Olive oil for gentle skin care.", price: 2500, currency: "NGN", image: productImages.care, badge: "Sales" },
  { id: "wipes", slug: "wipes", name: "Babysecret Wipes", category: "Baby Care", description: "Gentle wipes for everyday clean-ups.", price: 3000, currency: "NGN", image: productImages.care, badge: "Sales" },
  { id: "sanitizing-wipes", slug: "sanitizing-wipes", name: "Babysecret Sanitizing Wipes", category: "Hygiene", description: "Handy wipes for quick sanitising.", price: 1000, currency: "NGN", image: productImages.care, badge: "Sales" },
];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(price);
}
