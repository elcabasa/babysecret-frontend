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
  customer_id: number;
};

type RawWooOrder = {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency: string;
  billing?: { email?: string };
  customer_id?: number;
};

/**
 * Returns the orders belonging to exactly one WooCommerce customer.
 *
 * Isolation model: the customer id comes from the authenticated server-side
 * NextAuth session (never from the browser), and is used with WooCommerce's
 * `customer` list filter. NOTE: `email` is NOT a valid list filter in the
 * WooCommerce REST API — it is silently ignored and would return the latest
 * orders from every customer, which is exactly the leak this guards against.
 */
export async function getCustomerOrders(
  customerId: number | string,
): Promise<CustomerOrder[]> {
  const numericId = Number(customerId);

  if (!numericId || !Number.isFinite(numericId)) return [];

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  const res = await fetch(
    `${restUrl}/orders?customer=${numericId}&per_page=50`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error("Failed to retrieve order history");
  }

  const data = (await res.json()) as RawWooOrder[];

  if (!Array.isArray(data)) return [];

  // Defense in depth: only return orders unambiguously linked to the exact
  // customer, even if the downstream filter were ever misconfigured.
  return data
    .filter((order) => Number(order.customer_id) === numericId)
    .map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      date_created: order.date_created,
      total: order.total,
      currency: order.currency,
      customer_id: Number(order.customer_id),
    }));
}
