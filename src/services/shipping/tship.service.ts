import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingAddress,
  ShippingProvider,
} from "@/types/shipping";

const apiBase =
  process.env.TERMINAL_API_BASE ?? "https://api.terminal.africa/v1";
const apiKey = process.env.TERMINAL_API_KEY;

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

export const defaultItemWeightKg = Number(
  process.env.SHIPPING_ITEM_WEIGHT_KG ?? 0.4,
);

const countryCodes: Record<string, string> = {
  nigeria: "NG",
  "united states": "US",
  "united kingdom": "GB",
  ghana: "GH",
  kenya: "KE",
  "south africa": "ZA",
};

export function countryToCode(country: string): string {
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return countryCodes[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

function withPhonePlus(phone: string): string {
  const trimmed = phone.trim();
  if (/^(234|\+)/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+234${digits}`;
  return `+${digits || "2348012345678"}`;
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

type TshipRate = {
  rate_id: string;
  amount: number;
  currency: string;
  carrier_name: string;
  carrier_slug: string;
  carrier_logo?: string;
  carrier_rate_description?: string;
  delivery_time?: string;
  delivery_eta?: number;
  pickup_time?: string;
  used?: boolean;
};

type TshipAddress = {
  city: string;
  state: string;
  country: string;
  line1: string;
  line2: string;
  zip: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

function toTshipAddress(address: ShippingAddress): TshipAddress {
  return {
    city: address.city,
    state: address.state,
    country: countryToCode(address.country),
    line1: address.line1,
    line2: address.line2?.trim() ? address.line2 : address.line1,
    zip: address.zip || "000000",
    first_name: address.firstName,
    last_name: address.lastName,
    email: address.email,
    phone: withPhonePlus(address.phone),
  };
}

export class TerminalShipProvider implements ShippingProvider {
  async getQuotes(input: DeliveryQuoteInput): Promise<DeliveryQuote[]> {
    if (!apiKey) {
      throw new Error("Terminal Africa API key is not configured.");
    }

    const parcelItems = input.items.map((item) => ({
      name: item.name,
      description: item.description ?? item.name,
      currency: "NGN",
      value: Math.round(item.value),
      weight: item.weight,
      quantity: item.quantity,
    }));

    const payload = {
      pickup_address: toTshipAddress(input.pickup),
      delivery_address: toTshipAddress(input.delivery),
      parcel: {
        items: parcelItems,
        description: `Baby Secret order (${parcelItems.length} item${
          parcelItems.length === 1 ? "" : "s"
        })`,
        weight_unit: "kg",
      },
      currency: "NGN",
      persist_data: true,
      cash_on_delivery: false,
    };

    const response = await fetch(`${apiBase}/rates/shipment/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await parseJson(response);

    if (!response.ok || result.status !== true) {
      throw new Error(
        (result?.message as string | undefined) ??
          "Could not fetch delivery rates.",
      );
    }

    const rates = (result.data ?? []) as TshipRate[];

    return rates
      .filter((rate) => Number(rate.amount) > 0)
      .map((rate) => ({
        rateId: rate.rate_id,
        carrierName: rate.carrier_name,
        carrierSlug: rate.carrier_slug,
        carrierLogo: rate.carrier_logo,
        service: rate.carrier_rate_description ?? "Delivery",
        amount: Number(rate.amount),
        currency: "NGN" as const,
        deliveryTime: rate.delivery_time,
        deliveryEta: rate.delivery_eta,
      }))
      .sort((a, b) => a.amount - b.amount);
  }

  async arrangeShipment(input: {
    rateId: string;
    metadata?: Record<string, string>;
  }): Promise<ArrangedShipment> {
    if (!apiKey) {
      throw new Error("Terminal Africa API key is not configured.");
    }

    const response = await fetch(`${apiBase}/shipments/pickup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rate_id: input.rateId,
        metadata: input.metadata,
      }),
      cache: "no-store",
    });

    const result = await parseJson(response);

    if (!response.ok || result.status !== true) {
      throw new Error(
        (result?.message as string | undefined) ??
          "Could not arrange your delivery.",
      );
    }

    const data = result.data as {
      shipment_id?: string;
      status?: string;
      extras?: { tracking_number?: string };
    };

    return {
      shipmentId: data.shipment_id ?? "",
      trackingNumber: data.extras?.tracking_number,
      status: (data.status ?? "confirmed") as ArrangedShipment["status"],
    };
  }
}

export function defaultPickupAddress(): ShippingAddress {
  return { ...pickupDefaults };
}
