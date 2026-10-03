import "server-only";

/**
 * Server-side WooCommerce stock authority.
 *
 * The public Store API (used for browsing) exposes only booleans, so every
 * stock decision below reads the authenticated REST API instead:
 * - `GET /products/{id}` for simple/parent products
 * - `GET /products/{id}/variations/{variation_id}` for variations
 *
 * WooCommerce remains the final inventory authority; this module only
 * interprets its `purchasable / stock_status / manage_stock /
 * stock_quantity / backorders` fields into an order/no-order verdict.
 */

type RestRecord = {
  id?: unknown;
  type?: unknown;
  parent_id?: unknown;
  name?: unknown;
  purchasable?: unknown;
  stock_status?: unknown;
  manage_stock?: unknown;
  stock_quantity?: unknown;
  backorders?: unknown;
};

function wooConfig(): { restUrl: string; authHeader: string } {
  const restUrl = process.env.WOOCOMMERCE_REST_URL ?? "";
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY ?? "";
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET ?? "";

  if (!restUrl || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce product data is not configured.");
  }

  return {
    restUrl: restUrl.replace(/\/$/, ""),
    authHeader: `Basic ${Buffer.from(
      `${consumerKey}:${consumerSecret}`,
    ).toString("base64")}`,
  };
}

async function restGet(path: string): Promise<RestRecord | null> {
  const config = wooConfig();

  let response: Response;

  try {
    response = await fetch(`${config.restUrl}${path}`, {
      headers: {
        Authorization: config.authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("WooCommerce product data is unavailable.");
  }

  if (response.status === 404) return null;

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `WooCommerce product lookup failed (HTTP ${response.status}).`,
    );
  }

  let body: unknown = null;

  try {
    body = (await response.json()) as unknown;
  } catch {
    return null;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  return body as RestRecord;
}

function parsePositiveInt(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function backordersAllowed(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();

  return normalized === "yes" || normalized === "notify";
}

export interface StockLineInput {
  productId: string | number;
  variantId?: string | number | null;
  quantity: number;
  fallbackName?: string;
}

export type StockVerdict =
  | { ok: true; productId: number; variationId: number | null }
  | { ok: false; name: string; invalidVariation: boolean };

function displayName(record: RestRecord | null, input: StockLineInput): string {
  if (record && typeof record.name === "string" && record.name.trim()) {
    return record.name.trim();
  }

  return input.fallbackName?.trim() || `#${String(input.productId)}`;
}

/**
 * Validates one cart/order line against live WooCommerce stock.
 *
 * - A supplied `variantId` must resolve to a real variation OF the given
 *   parent product; otherwise the verdict is `invalidVariation` (callers
 *   reject with 400 — a selected variation must never silently become the
 *   parent product).
 * - Stock failures (missing product, unpurchasable, out of stock without
 *   backorders, insufficient managed quantity) yield `ok: false` with
 *   `invalidVariation: false` (callers reject with 409/unavailable).
 */
export async function checkLineStock(
  input: StockLineInput,
): Promise<StockVerdict> {
  const quantity =
    Number.isInteger(input.quantity) && input.quantity > 0
      ? input.quantity
      : 1;

  const productId = parsePositiveInt(input.productId);

  if (productId === null) {
    return {
      ok: false,
      name: input.fallbackName?.trim() || "an item in your cart",
      invalidVariation: false,
    };
  }

  const product = await restGet(`/products/${productId}`);

  if (!product) {
    return {
      ok: false,
      name: input.fallbackName?.trim() || `#${productId}`,
      invalidVariation: false,
    };
  }

  let variationId: number | null = null;
  let variation: RestRecord | null = null;

  if (input.variantId !== undefined && input.variantId !== null && String(input.variantId).trim() !== "") {
    variationId = parsePositiveInt(input.variantId);

    if (variationId === null) {
      return { ok: false, name: displayName(product, input), invalidVariation: true };
    }

    variation = await restGet(`/products/${productId}/variations/${variationId}`);

    // The variation must exist AND belong to this parent product.
    if (!variation || parsePositiveInt(variation.parent_id) !== productId) {
      return { ok: false, name: displayName(product, input), invalidVariation: true };
    }
  }

  // Variation fields win when present; otherwise the parent's apply.
  const pick = (key: keyof RestRecord): unknown =>
    variation && variation[key] !== undefined && variation[key] !== null
      ? variation[key]
      : product[key];

  if (pick("purchasable") === false) {
    return { ok: false, name: displayName(variation ?? product, input), invalidVariation: false };
  }

  if (
    String(pick("stock_status") ?? "").trim().toLowerCase() === "outofstock" &&
    !backordersAllowed(pick("backorders"))
  ) {
    return { ok: false, name: displayName(variation ?? product, input), invalidVariation: false };
  }

  if (pick("manage_stock") === true && !backordersAllowed(pick("backorders"))) {
    const onHand = pick("stock_quantity");

    if (typeof onHand !== "number" || !Number.isFinite(onHand) || onHand < quantity) {
      return { ok: false, name: displayName(variation ?? product, input), invalidVariation: false };
    }
  }

  return { ok: true, productId, variationId };
}

export interface CartStockReport {
  valid: boolean;
  unavailableNames: string[];
  /**
   * Set when a supplied variation id could not be resolved to a variation
   * of its parent product. Callers reject these requests with 400 (malformed
   * variation), never by silently ordering the parent instead.
   */
  invalidVariationName: string | null;
  /** Lines that passed, with resolved numeric ids for order creation. */
  validLines: { productId: number; variationId: number | null; quantity: number }[];
}

/**
 * Validates a whole cart/order. Throws only on WooCommerce outage or
 * misconfiguration (callers surface a generic 500); stock problems are data,
 * returned in the report for a 409/unavailable-items response.
 */
export async function checkCartStock(
  inputs: StockLineInput[],
): Promise<CartStockReport> {
  const unavailableNames: string[] = [];
  const validLines: CartStockReport["validLines"] = [];
  let invalidVariationName: string | null = null;

  for (const input of inputs) {
    const verdict = await checkLineStock(input);

    if (!verdict.ok) {
      if (verdict.invalidVariation) {
        invalidVariationName ??= verdict.name;
      } else {
        unavailableNames.push(verdict.name);
      }

      continue;
    }

    validLines.push({
      productId: verdict.productId,
      variationId: verdict.variationId,
      quantity:
        Number.isInteger(input.quantity) && input.quantity > 0
          ? input.quantity
          : 1,
    });
  }

  // A bogus variation is a malformed request (400), reported separately via
  // `invalidVariationName` — never folded into the 409 unavailable list.
  return {
    valid: unavailableNames.length === 0 && invalidVariationName === null,
    unavailableNames,
    invalidVariationName,
    validLines,
  };
}
