/**
 * Server-side WooCommerce parcel-weight resolution.
 *
 * Every delivery quote must use the weight stored in WooCommerce, never a
 * client-supplied value. Request schemas intentionally do not accept `weight`;
 * this module fetches the authoritative product or variation record through
 * the authenticated WooCommerce REST API and normalizes its weight to
 * kilograms.
 *
 * Fallback policy:
 * - variation weight when valid;
 * - parent-product weight when the variation weight is absent or invalid;
 * - `DEFAULT_PARCEL_ITEM_WEIGHT_KG` only when neither source is valid.
 */

export const DEFAULT_PARCEL_ITEM_WEIGHT_KG = 0.5;

const KG_PER_UNIT: Record<string, number> = {
  kg: 1,
  g: 1 / 1000,
  lbs: 0.45359237,
  oz: 0.028349523125,
};

// Binary floating-point arithmetic can turn an exact-looking conversion such
// as 700g into 0.7000000000000001kg. Milligram-level cleanup preserves every
// realistic parcel-weight difference while keeping Terminal payloads stable.
const WEIGHT_PRECISION = 1_000_000;

export interface ParcelWeightInput {
  productId: string | number;
  variantId?: string | number | null;
  quantity: number;
}

export type ParcelWeightSource =
  | "variation"
  | "product"
  | "parent"
  | "default";

export interface ParcelWeightResult {
  productId: string;
  variantId?: string;
  quantity: number;
  unitWeightKg: number;
  lineWeightKg: number;
  source: ParcelWeightSource;
}

export interface ResolvedParcelWeights {
  items: ParcelWeightResult[];
  totalParcelWeightKg: number;
  storeWeightUnit: string;
}

export interface WooWeightResponse {
  status: number;
  body: unknown;
}

export type WooWeightFetcher = (
  path: string,
) => Promise<WooWeightResponse>;

interface WooWeightRecord {
  id?: unknown;
  type?: unknown;
  parent_id?: unknown;
  weight?: unknown;
}

function normalizeWeightUnit(unit: unknown): string | null {
  if (typeof unit !== "string") return null;

  switch (unit.trim().toLowerCase()) {
    case "kg":
    case "kilogram":
    case "kilograms":
      return "kg";
    case "g":
    case "gram":
    case "grams":
      return "g";
    case "lb":
    case "lbs":
    case "pound":
    case "pounds":
      return "lbs";
    case "oz":
    case "ounce":
    case "ounces":
      return "oz";
    default:
      return null;
  }
}

/**
 * Converts a WooCommerce weight into kilograms.
 *
 * Returns `null` for absent, blank, zero, negative, non-finite, unparseable,
 * or unit-unknown values. Callers apply the single 0.5 kg fallback.
 */
export function parseWooWeightKg(
  value: unknown,
  unit?: unknown,
): number | null {
  let numeric: number;

  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const text = value.trim();

    if (!text) return null;

    numeric = Number(text);
  } else {
    return null;
  }

  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const unitKey =
    unit === undefined || unit === null || unit === ""
      ? "kg"
      : normalizeWeightUnit(unit);

  if (!unitKey) return null;

  const kilograms = numeric * KG_PER_UNIT[unitKey];

  return Math.round(kilograms * WEIGHT_PRECISION) / WEIGHT_PRECISION;
}

function parseWooId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!/^\d+$/.test(text)) return null;

    const numeric = Number(text);

    return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
  }

  return null;
}

function normalizeQuantity(quantity: unknown): number {
  return typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity > 0
    ? quantity
    : 1;
}

function asWeightRecord(body: unknown): WooWeightRecord | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  return body as WooWeightRecord;
}

function wooRestConfig(): { restUrl: string; authHeader: string } {
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

async function defaultWooWeightFetcher(
  path: string,
): Promise<WooWeightResponse> {
  const config = wooRestConfig();
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
    // Intentionally generic: transport details and credentials stay out of logs.
    throw new Error("WooCommerce product data is unavailable.");
  }

  let body: unknown = null;

  try {
    body = (await response.json()) as unknown;
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

async function getStoreWeightUnit(
  fetcher: WooWeightFetcher,
): Promise<string> {
  try {
    const response = await fetcher("/settings/products");

    if (response.status !== 200 || !Array.isArray(response.body)) {
      return "kg";
    }

    const setting = response.body.find(
      (entry): entry is { id?: unknown; value?: unknown } =>
        !!entry &&
        typeof entry === "object" &&
        (entry as { id?: unknown }).id === "woocommerce_weight_unit",
    );

    return normalizeWeightUnit(setting?.value) ?? "kg";
  } catch {
    return "kg";
  }
}

async function fetchWeightRecord(
  fetcher: WooWeightFetcher,
  path: string,
): Promise<WooWeightRecord | null> {
  const response = await fetcher(path);

  if (response.status === 404) return null;

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `WooCommerce product lookup failed (HTTP ${response.status}).`,
    );
  }

  return asWeightRecord(response.body);
}

function productPath(productId: number): string {
  return `/products/${productId}`;
}

function variationPath(productId: number, variationId: number): string {
  return `/products/${productId}/variations/${variationId}`;
}

interface WeightLookupContext {
  fetcher: WooWeightFetcher;
  storeWeightUnit: string;
  productCache: Map<number, WooWeightRecord | null>;
  variationCache: Map<string, WooWeightRecord | null>;
}

async function getProduct(
  context: WeightLookupContext,
  productId: number,
): Promise<WooWeightRecord | null> {
  const cached = context.productCache.get(productId);

  if (cached !== undefined) return cached;

  const record = await fetchWeightRecord(
    context.fetcher,
    productPath(productId),
  );

  context.productCache.set(productId, record);

  return record;
}

async function getVariation(
  context: WeightLookupContext,
  productId: number,
  variationId: number,
): Promise<WooWeightRecord | null> {
  const cacheKey = `${productId}:${variationId}`;
  const cached = context.variationCache.get(cacheKey);

  if (cached !== undefined) return cached;

  const record = await fetchWeightRecord(
    context.fetcher,
    variationPath(productId, variationId),
  );

  context.variationCache.set(cacheKey, record);

  return record;
}

async function resolveUnitWeight(
  context: WeightLookupContext,
  productId: number | null,
  variationId: number | null,
): Promise<{ unitWeightKg: number; source: ParcelWeightSource }> {
  if (variationId !== null) {
    let variation: WooWeightRecord | null = null;
    let parentId = productId;

    if (productId !== null) {
      variation = await getVariation(context, productId, variationId);
    } else {
      // A bare variation identifier has no separate parent context. Ask the
      // product endpoint for that record; when WooCommerce returns its
      // variation shape, its parent_id supplies the fallback lookup.
      variation = await getProduct(context, variationId);
      parentId = parseWooId(variation?.parent_id);
    }

    const variationWeight = parseWooWeightKg(
      variation?.weight,
      context.storeWeightUnit,
    );

    if (variationWeight !== null) {
      return { unitWeightKg: variationWeight, source: "variation" };
    }

    if (parentId !== null) {
      const parent = await getProduct(context, parentId);
      const parentWeight = parseWooWeightKg(
        parent?.weight,
        context.storeWeightUnit,
      );

      if (parentWeight !== null) {
        return { unitWeightKg: parentWeight, source: "parent" };
      }
    }

    return {
      unitWeightKg: DEFAULT_PARCEL_ITEM_WEIGHT_KG,
      source: "default",
    };
  }

  if (productId === null) {
    return {
      unitWeightKg: DEFAULT_PARCEL_ITEM_WEIGHT_KG,
      source: "default",
    };
  }

  const product = await getProduct(context, productId);
  const productWeight = parseWooWeightKg(
    product?.weight,
    context.storeWeightUnit,
  );

  if (productWeight !== null) {
    return { unitWeightKg: productWeight, source: "product" };
  }

  // A product endpoint can itself return a variation record. If it carries a
  // usable parent, honour the variation-then-parent rule.
  if (product?.type === "variation") {
    const parentId = parseWooId(product.parent_id);

    if (parentId !== null) {
      const parent = await getProduct(context, parentId);
      const parentWeight = parseWooWeightKg(
        parent?.weight,
        context.storeWeightUnit,
      );

      if (parentWeight !== null) {
        return { unitWeightKg: parentWeight, source: "parent" };
      }
    }
  }

  return {
    unitWeightKg: DEFAULT_PARCEL_ITEM_WEIGHT_KG,
    source: "default",
  };
}

/**
 * Resolves authoritative per-unit weights for cart items.
 *
 * Quantities are preserved unchanged. The returned `lineWeightKg` is the
 * resolved unit weight multiplied by quantity, while Terminal Africa receives
 * the normalized unit weight alongside the separate quantity.
 */
export async function resolveParcelWeights(
  inputs: ParcelWeightInput[],
  options: {
    fetcher?: WooWeightFetcher;
    storeWeightUnit?: string;
  } = {},
): Promise<ResolvedParcelWeights> {
  const fetcher = options.fetcher ?? defaultWooWeightFetcher;
  const storeWeightUnit =
    options.storeWeightUnit ?? (await getStoreWeightUnit(fetcher));
  const context: WeightLookupContext = {
    fetcher,
    storeWeightUnit,
    productCache: new Map(),
    variationCache: new Map(),
  };

  const items = await Promise.all(
    inputs.map(async (input) => {
      const productId = parseWooId(input.productId);
      const variationId = parseWooId(input.variantId);
      const quantity = normalizeQuantity(input.quantity);
      const { unitWeightKg, source } = await resolveUnitWeight(
        context,
        productId,
        variationId,
      );

      return {
        productId:
          productId !== null ? String(productId) : String(input.productId),
        ...(variationId !== null
          ? { variantId: String(variationId) }
          : {}),
        quantity,
        unitWeightKg,
        lineWeightKg: unitWeightKg * quantity,
        source,
      };
    }),
  );

  return {
    items,
    totalParcelWeightKg: items.reduce(
      (total, item) => total + item.lineWeightKg,
      0,
    ),
    storeWeightUnit,
  };
}
