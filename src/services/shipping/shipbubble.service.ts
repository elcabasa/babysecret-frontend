import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingAddress,
  ShippingProvider,
} from "@/types/shipping";

/**
 * Shipbubble API integration.
 *
 * Shipbubble routes shipments through courier networks using a two-step flow:
 *   1. Validate the pickup + delivery addresses to obtain address codes.
 *   2. Request rates (POST /shipping/fetch_rates) with those address codes,
 *      a package category, package dimension and the parcel items.
 *
 * Creating a shipment (POST /shipping/labels) then requires the request token
 * and the selected courier's service code + id that came back from the rates
 * call. Those values are encoded into the DeliveryQuote.rateId so the provider
 * can reconstruct them later without changing the ShippingProvider interface.
 */

const apiBase =
  process.env.SHIPPUBBLE_API_BASE ?? "https://api.shipbubble.com/v1";
const apiKey = process.env.SHIPPUBBLE_API_KEY;

const pickupDefaults = {
  firstName: process.env.SHIPPING_PICKUP_FIRST_NAME ?? "Baby Secret",
  lastName: process.env.SHIPPING_PICKUP_LAST_NAME ?? "Store",
  email: process.env.SHIPPING_PICKUP_EMAIL ?? "delivery@babysecret.com",
  phone: process.env.SHIPPING_PICKUP_PHONE ?? "+2348012345678",
  line1: process.env.SHIPPING_PICKUP_ADDRESS ?? "Ikeja, Lagos",
  city: process.env.SHIPPING_PICKUP_CITY ?? "Ikeja",
  state: process.env.SHIPPING_PICKUP_STATE ?? "Lagos",
  country: process.env.SHIPPING_PICKUP_COUNTRY ?? "NG",
  zip: process.env.SHIPPING_PICKUP_ZIP ?? "121006",
};

const countryNames: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  US: "United States",
  GB: "United Kingdom",
  ZA: "South Africa",
};

/**
 * Smallest box dimensions fall back to the default courier box so rate
 * requests always carry a valid package_dimension.
 */
const defaultParcelDimension = { length: 12, width: 10, height: 10 };

function toCountryName(country: string): string {
  const code = country.trim().toUpperCase();
  return countryNames[code] ?? "Nigeria";
}

function formatPhone(phone: string): string {
  const trimmed = phone.trim();
  if (/^\+/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+234${digits}`;
  return `+${digits || "2348012345678"}`;
}

function fullAddress(address: ShippingAddress): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    toCountryName(address.country),
  ].filter(Boolean);
  return parts.join(", ");
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function requireApiKey(): void {
  if (!apiKey) {
    throw new Error("Shipbubble API key is not configured.");
  }
}

/**
 * Validates a physical address with Shipbubble and returns its address code,
 * which is required by the fetch_rates API.
 */
async function validateAddress(address: ShippingAddress): Promise<number> {
  const response = await fetch(`${apiBase}/shipping/address/validate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `${address.firstName} ${address.lastName}`.trim(),
      email: address.email,
      phone: formatPhone(address.phone),
      address: fullAddress(address),
    }),
    cache: "no-store",
  });

  const result = await parseJson(response);

  if (!response.ok || result.status !== "success") {
    throw new Error(
      (result?.message as string | undefined) ??
        "Could not validate a delivery address with Shipbubble.",
    );
  }

  const data = result.data as { address_code?: number | string };
  const code = Number(data.address_code);

  if (!code) {
    throw new Error("Shipbubble did not return an address code.");
  }

  return code;
}

type ShipbubbleCategory = { category_id: number; category: string };

/**
 * Fetches the available package categories and returns the id for the most
 * generic option, falling back to the first category when no match is found.
 */
async function fetchCategoryId(): Promise<number> {
  const response = await fetch(`${apiBase}/shipping/labels/categories`, {
    headers: headers(),
    cache: "no-store",
  });

  const result = await parseJson(response);

  if (!response.ok || result.status !== "success") {
    throw new Error(
      (result?.message as string | undefined) ??
        "Could not load Shipbubble package categories.",
    );
  }

  const categories = (result.data ?? []) as ShipbubbleCategory[];

  const preferred = categories.find((category) =>
    ["accessories", "fashion wears", "general"].includes(
      category.category.toLowerCase(),
    ),
  );

  return preferred?.category_id ?? categories[0]?.category_id;
}

type ShipbubbleCourier = {
  courier_id: string | number;
  courier_name: string;
  courier_image?: string;
  service_code: string;
  // The amount shown to the customer.
  rate_card_amount: number | string;
  // The amount actually charged from the wallet.
  total: number | string;
  currency?: string;
  delivery_eta?: string;
  pickup_eta?: string;
};

type ShipbubbleRatesResponse = {
  request_token?: string;
  couriers?: ShipbubbleCourier[];
};

/**
 * Encodes the Shipbubble request token and courier identifiers into a single
 * rate id so the shipment can be created later. Format:
 * sb:<token>:<service_code>:<courier_id>
 */
function buildRateId(token: string, courier: ShipbubbleCourier): string {
  return ["sb", token, courier.service_code, String(courier.courier_id)].join(
    ":",
  );
}

function parseRateId(rateId: string): {
  token: string;
  serviceCode: string;
  courierId: string;
} {
  const [, token, serviceCode, courierId] = rateId.split(":");
  return { token, serviceCode, courierId };
}

function normalizeCourier(
  courier: ShipbubbleCourier,
  token: string,
): DeliveryQuote {
  return {
    rateId: buildRateId(token, courier),
    carrierName: courier.courier_name,
    carrierSlug: courier.service_code,
    carrierLogo: courier.courier_image,
    service: courier.service_code,
    amount: Number(courier.rate_card_amount ?? courier.total),
    currency: "NGN",
    deliveryTime: courier.delivery_eta,
  };
}

function isValidQuote(quote: DeliveryQuote): boolean {
  return Number.isFinite(quote.amount) && quote.amount > 0;
}

async function fetchRates(
  payload: Record<string, unknown>,
): Promise<ShipbubbleRatesResponse> {
  const response = await fetch(`${apiBase}/shipping/fetch_rates`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const result = await parseJson(response);

  if (!response.ok || result.status !== "success") {
    throw new Error(
      (result?.message as string | undefined) ??
        "Could not fetch Shipbubble delivery rates.",
    );
  }

  return (result.data ?? {}) as ShipbubbleRatesResponse;
}

export class ShipbubbleShippingProvider implements ShippingProvider {
  async getQuotes(input: DeliveryQuoteInput): Promise<DeliveryQuote[]> {
    requireApiKey();

    const senderAddressCode = await validateAddress(input.pickup);
    const receiverAddressCode = await validateAddress(input.delivery);
    const categoryId = await fetchCategoryId();

    const items = input.items.map((item) => ({
      name: item.name,
      description: item.description ?? item.name,
      unit_weight: String(item.weight),
      unit_amount: String(Math.round(item.value)),
      quantity: String(item.quantity),
    }));

    const payload = {
      sender_address_code: senderAddressCode,
      reciever_address_code: receiverAddressCode,
      pickup_date: new Date().toISOString().slice(0, 10),
      category_id: categoryId,
      package_items: items,
      package_dimension: defaultParcelDimension,
    };

    const rates = await fetchRates(payload);
    const token = rates.request_token ?? "";

    return (rates.couriers ?? [])
      .map((courier) => normalizeCourier(courier, token))
      .filter(isValidQuote)
      .sort((a, b) => a.amount - b.amount);
  }

  async arrangeShipment(input: {
    rateId: string;
    metadata?: Record<string, string>;
  }): Promise<ArrangedShipment> {
    requireApiKey();

    const { token, serviceCode, courierId } = parseRateId(input.rateId);

    if (!token || !serviceCode || !courierId) {
      throw new Error("Invalid Shipbubble rate id.");
    }

    const response = await fetch(`${apiBase}/shipping/labels`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        request_token: token,
        service_code: serviceCode,
        courier_id: courierId,
      }),
      cache: "no-store",
    });

    const result = await parseJson(response);

    if (!response.ok || result.status !== "success") {
      throw new Error(
        (result?.message as string | undefined) ??
          "Could not create your Shipbubble shipment.",
      );
    }

    const data = result.data as {
      order_id?: string;
      status?: string;
      tracking_url?: string;
    };

    return {
      shipmentId: data.order_id ?? "",
      trackingNumber: data.tracking_url,
      status: (data.status ?? "pending") as ArrangedShipment["status"],
    };
  }
}

export function defaultPickupAddress(): ShippingAddress {
  return { ...pickupDefaults };
}
