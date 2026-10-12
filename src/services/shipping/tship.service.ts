import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingAddress,
  ShippingProvider,
} from "@/types/shipping";
import {
  resolveTerminalDestination,
  terminalCountryCode,
  wrapAddressLines,
} from "@/services/shipping/address-resolution";
import { createHash } from "node:crypto";

const apiBase =
  process.env.TERMINAL_API_BASE ?? "https://api.terminal.africa/v1";
const apiKey = process.env.TERMINAL_API_KEY;

const pickupDefaults = {
  firstName: process.env.SHIPPING_PICKUP_FIRST_NAME ?? "Baby Secret",
  lastName: process.env.SHIPPING_PICKUP_LAST_NAME ?? "Store",
  email: process.env.SHIPPING_PICKUP_EMAIL ?? "delivery@babysecret.com",
  phone: process.env.SHIPPING_PICKUP_PHONE ?? "+2348012345678",
  // Terminal origin: Flawless Plaza, Ojo, Lagos, NG, 102101. line1 stays short
  // because Terminal rejects line1 longer than 45 characters (see
  // wrapAddressLines); the full collection-point address lives in
  // src/config/pickup.ts and SHIPPING_PICKUP_ADDRESS env.
  line1: process.env.SHIPPING_PICKUP_ADDRESS ?? "Flawless Plaza",
  city: process.env.SHIPPING_PICKUP_CITY ?? "Ojo",
  state: process.env.SHIPPING_PICKUP_STATE ?? "Lagos",
  country: process.env.SHIPPING_PICKUP_COUNTRY ?? "NG",
  zip: process.env.SHIPPING_PICKUP_ZIP ?? "102101",
};

export function countryToCode(country: string): string {
  // Single source of truth lives in address-resolution.ts so the dropdown,
  // validation, and quote payloads all normalize countries identically.
  return terminalCountryCode(country);
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
  delivery_date?: string;
  pickup_time?: string;
  pickup_eta?: number;
  used?: boolean;
  metadata?: {
    distance?: unknown;
    true_weight?: unknown;
    score?: unknown;
    pricing_tier?: unknown;
    shipment_service_charge?: unknown;
    insurance_fee?: unknown;
    default_parcel?: {
      parcel_total_weight?: unknown;
      parcel_value?: unknown;
    };
  };
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
  const zip = (address.zip ?? "").trim();

  if (!zip) {
    // Terminal requires a postal code when persisting address data. The
    // customer must supply it — inventing one (previously "000000") corrupts
    // validation and rate accuracy.
    throw new Error("A postal/ZIP code is required for delivery.");
  }

  // Terminal rejects line1 longer than 45 characters. Rewrap overflow onto
  // line2 (field layout only — the location itself never changes).
  const wrapped = wrapAddressLines(address.line1, address.line2 ?? "");

  return {
    city: address.city,
    state: address.state,
    country: countryToCode(address.country),
    line1: wrapped.line1,
    line2: wrapped.line2.trim() ? wrapped.line2 : wrapped.line1,
    zip,
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

    /*
     * Resolve the customer destination against Terminal's own city data and
     * address validation before quoting. Same helper serves the quote endpoint
     * and checkout re-verification, so both always agree.
     */
    const resolved = await resolveTerminalDestination({
      city: input.delivery.city,
      state: input.delivery.state,
      country: input.delivery.country,
      line1: input.delivery.line1,
      line2: input.delivery.line2,
      zip: input.delivery.zip ?? "",
    });

    console.info("[shipping] Terminal destination resolution", {
      submittedState: resolved.diagnostics.submittedState,
      submittedCity: resolved.diagnostics.submittedCity,
      submittedPostalCode: resolved.diagnostics.submittedPostalCode,
      submittedAddress: resolved.diagnostics.submittedAddress,
      resolvedCity: resolved.diagnostics.resolvedCity,
      resolvedState: resolved.diagnostics.resolvedState,
      validationSucceeded: resolved.diagnostics.validationSucceeded,
      validationNotes: resolved.diagnostics.validationNotes,
    });

    const deliveryAddress = toTshipAddress({
      ...input.delivery,
      city: resolved.address.city,
      state: resolved.address.state,
      line1: resolved.address.line1,
      line2: resolved.address.line2,
      zip: resolved.address.zip,
    });

    const payload = {
      pickup_address: toTshipAddress(input.pickup),
      delivery_address: deliveryAddress,
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

    /*
     * Development-only normalized fingerprint of the exact Terminal request.
     * Two devices/browsers sending the same address + cart produce the same
     * fingerprint, so mobile-vs-desktop divergences can be attributed to
     * either a different request (different fingerprint) or Terminal itself
     * (same fingerprint, different rates). The postcode is hashed — equality
     * is comparable without storing customer PII in logs. Never logs keys.
     */
    if (process.env.NODE_ENV !== "production") {
      const normalizedRequest = {
        origin: {
          city: payload.pickup_address.city,
          state: payload.pickup_address.state,
          country: payload.pickup_address.country,
          zip: payload.pickup_address.zip,
        },
        destination: {
          country: deliveryAddress.country,
          state: deliveryAddress.state,
          city: deliveryAddress.city,
          zipHash: createHash("sha256")
            .update(deliveryAddress.zip.trim(), "utf8")
            .digest("hex")
            .slice(0, 16),
        },
        items: parcelItems.map((item) => ({
          name: item.name,
          value: item.value,
          weight: item.weight,
          quantity: item.quantity,
        })),
        totalWeightKg: parcelItems.reduce(
          (total, item) => total + item.weight * item.quantity,
          0,
        ),
        weightUnit: "kg",
        currency: "NGN",
      };

      console.info(
        `[shipping] Quote request fingerprint ${createHash("sha256")
          .update(JSON.stringify(normalizedRequest), "utf8")
          .digest("hex")
          .slice(0, 16)} ${JSON.stringify(normalizedRequest)}`,
      );
    }

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
      const message = (result?.message as string | undefined) ?? "";

      /*
       * An unrecognized DELIVERY city means Terminal has no coverage for that
       * spelling — not a provider outage. Surface it as zero rates so the UI
       * offers pickup/assistance instead of a technical error. A broken PICKUP
       * (origin) address is our configuration bug and must stay loud.
       */
      if (
        response.status === 400 &&
        /delivery address - invalid city/i.test(message)
      ) {
        console.info("[shipping] Terminal has no coverage for city", {
          city: resolved.address.city,
          state: resolved.address.state,
          ratesReturned: 0,
        });

        return [];
      }

      throw new Error(message || "Could not fetch delivery rates.");
    }

    const rates = (result.data ?? []) as TshipRate[];

    const quotes = rates
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

    console.info("[shipping] Terminal rates returned", {
      city: resolved.address.city,
      state: resolved.address.state,
      ratesReturned: quotes.length,
    });

    /*
     * Development-only raw Terminal metadata per rate. Explicit allowlist —
     * address payloads, user/account ids, and tracking internals inside
     * `metadata` are never logged. Used to explain courier presence,
     * pricing, and ETAs (e.g. why GIG appears for one request but not
     * another) without touching the returned quotes.
     */
    if (process.env.NODE_ENV !== "production") {
      for (const rate of rates) {
        console.info(
          `[shipping] Terminal raw rate ${JSON.stringify({
            carrier_name: rate.carrier_name,
            carrier_slug: rate.carrier_slug,
            amount: rate.amount,
            currency: rate.currency,
            rate_id: rate.rate_id,
            carrier_rate_description: rate.carrier_rate_description,
            pickup_time: rate.pickup_time,
            pickup_eta: rate.pickup_eta,
            delivery_time: rate.delivery_time,
            delivery_eta: rate.delivery_eta,
            delivery_date: rate.delivery_date,
            distance: rate.metadata?.distance,
            true_weight: rate.metadata?.true_weight,
            parcel_total_weight:
              rate.metadata?.default_parcel?.parcel_total_weight,
            parcel_value: rate.metadata?.default_parcel?.parcel_value,
            score: rate.metadata?.score,
            pricing_tier: rate.metadata?.pricing_tier,
            shipment_service_charge: rate.metadata?.shipment_service_charge,
            insurance_fee: rate.metadata?.insurance_fee,
          })}`,
        );
      }
    }

    return quotes;
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
