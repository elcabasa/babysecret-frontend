const restUrl =
  process.env.WOOCOMMERCE_REST_URL ?? "https://babysecret.com/wp-json/wc/v3";

const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY ?? "";
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET ?? "";

export type CustomerOrder = {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency: string;
};

export async function getCustomerOrders(
  customerEmail: string
): Promise<CustomerOrder[]> {
  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  const res = await fetch(
    `${restUrl}/orders?email=${encodeURIComponent(customerEmail)}&per_page=50`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to retrieve order history");
  }

  const data = (await res.json()) as CustomerOrder[];
  return Array.isArray(data) ? data : [];
}