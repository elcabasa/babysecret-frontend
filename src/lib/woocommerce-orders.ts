const restUrl =
  process.env.WOOCOMMERCE_REST_URL ??
  "https://app.babysecret.com/wp-json/wc/v3";

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

export type WooOrderMeta = { id?: number; key: string; value: unknown };

export type WooOrderAddress = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

export type WooOrderLineItem = {
  id?: number;
  name?: string;
  product_id?: number;
  variation_id?: number;
  quantity?: number | string;
  total?: string;
};

export type RawWooOrder = {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_modified?: string;
  total: string;
  currency: string;
  customer_id?: number;
  billing?: WooOrderAddress;
  shipping?: WooOrderAddress;
  meta_data?: WooOrderMeta[];
  line_items?: WooOrderLineItem[];
  payment_method?: string;
  payment_method_title?: string;
  date_paid?: string | null;
};

/** Meta key holding the app-side payment reference for an order. */
export const ORDER_REFERENCE_META_KEY = "_babysecret_paystack_reference";

/** Meta key holding the JSON array of transactional emails already sent. */
export const ORDER_EMAIL_LOG_META_KEY = "_babysecret_emails_sent";

/**
 * WooCommerce credentials, or `null` when the store is not configured.
 */
export function getWooConfig(): {
  restUrl: string;
  authHeader: string;
} | null {
  if (!restUrl || !consumerKey || !consumerSecret) return null;

  return {
    restUrl,
    authHeader: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    )}`,
  };
}

/**
 * Reads a single meta value off an order, returning `""` when absent.
 */
export function metaValue(meta: WooOrderMeta[] | undefined, key: string) {
  return meta?.find((entry) => entry.key === key)?.value?.toString() ?? "";
}

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

  const config = getWooConfig();

  if (!config) return [];

  const res = await fetch(
    `${config.restUrl}/orders?customer=${numericId}&per_page=50`,
    {
      headers: {
        Authorization: config.authHeader,
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

/**
 * Fetches a single order by id, or `null` when it cannot be read.
 */
export async function getWooOrderById(
  orderId: number,
): Promise<RawWooOrder | null> {
  const config = getWooConfig();

  if (!config) return null;

  const res = await fetch(`${config.restUrl}/orders/${orderId}`, {
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`WooCommerce order read failed (${orderId}):`, res.status);
    return null;
  }

  return (await res.json()) as RawWooOrder;
}
/**
 * Finds the order carrying the given app-side payment reference.
 *
 * WooCommerce's `/orders` collection does NOT honor `meta_key`/`meta_value`
 * query parameters — unknown params are silently ignored and the endpoint
 * returns the most recent orders. Filtering server-side with `orders[0]` is
 * therefore WRONG: any reference (including a bogus one) would resolve to
 * somebody else's newest order, leaking its total and binding payments and
 * transfer claims to the wrong order.
 *
 * Instead, page through recent orders and match the stored meta value
 * EXACTLY in code. The cap bounds the scan; references older than the cap
 * resolve to null (treated as unknown, never as another order).
 */
export async function getWooOrderByReference(
  reference: string,
): Promise<RawWooOrder | null> {
  const config = getWooConfig();

  if (!config) return null;

  const wanted = reference.trim();

  if (!wanted) return null;

  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `${config.restUrl}/orders?per_page=100&page=${page}&orderby=date&order=desc`,
      {
        headers: {
          Authorization: config.authHeader,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      console.error("WooCommerce order lookup failed:", res.status);
      return null;
    }

    const orders = (await res.json()) as RawWooOrder[];

    if (!Array.isArray(orders) || !orders.length) return null;

    const match = orders.find((order) =>
      (order.meta_data ?? []).some(
        (meta) =>
          meta.key === ORDER_REFERENCE_META_KEY &&
          String(meta.value) === wanted,
      ),
    );

    if (match) return match;
    if (orders.length < 100) return null;
  }

  return null;
}

/**
 * Updates an order. Used for status changes and for appending order meta.
 */
export async function updateWooOrder(
  orderId: number,
  payload: Record<string, unknown>,
): Promise<RawWooOrder | null> {
  const config = getWooConfig();

  if (!config) return null;

  const res = await fetch(`${config.restUrl}/orders/${orderId}`, {
    method: "PUT",
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Status only: Woo's error body can echo customer PII.
    console.error(`WooCommerce order update failed (${orderId}):`, res.status);
    return null;
  }

  return (await res.json()) as RawWooOrder;
}

/**
 * Appends meta entries to an order.
 *
 * WooCommerce merges meta entries that carry no `id`, so existing meta is left
 * untouched — safe for recording side-car data such as the sent-email log.
 */
export async function appendWooOrderMeta(
  orderId: number,
  entries: { key: string; value: string }[],
): Promise<RawWooOrder | null> {
  if (!entries.length) return null;

  return updateWooOrder(orderId, { meta_data: entries });
}