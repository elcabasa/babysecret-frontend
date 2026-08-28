import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingProvider,
} from "@/types/shipping";
import { countryToCode } from "@/services/shipping/tship.service";

const storeUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL;

type StoreAddress = {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
};

type ShippingRate = {
  rate_id: string;
  name: string;
  description: string;
  price: string;
  delivery_time?: string;
  selected?: boolean;
};

type ShippingPackage = {
  package_id: number;
  name: string;
  shipping_rates?: ShippingRate[];
};

type StoreCart = {
  shipping_rates?: ShippingPackage[];
  totals?: {
    currency_minor_unit?: number;
    currency_code?: string;
  };
};

function extractCartToken(response: Response): string | undefined {
  const header = response.headers.get("cart-token");
  if (header) return header;

  const setCookies = response.headers.getSetCookie?.() ?? [
    response.headers.get("set-cookie"),
  ].filter(Boolean) as string[];

  for (const cookie of setCookies) {
    const match = cookie.match(/(wc_cart_created_[^=]+)=([^;]+)/);
    if (match?.[2]) return decodeURIComponent(match[2]);
  }
}

function extractNonce(response: Response): string | undefined {
  return response.headers.get("nonce") ?? undefined;
}

function toStoreAddress(address: DeliveryQuoteInput["delivery"]): StoreAddress {
  return {
    first_name: address.firstName,
    last_name: address.lastName,
    address_1: address.line1,
    city: address.city,
    state: address.state,
    postcode: address.zip || "000000",
    country: countryToCode(address.country),
    email: address.email,
    phone: address.phone,
  };
}

export class WooCommerceShippingProvider implements ShippingProvider {
  async getQuotes(input: DeliveryQuoteInput): Promise<DeliveryQuote[]> {
    if (!storeUrl) {
      throw new Error(
        "WooCommerce Store API URL is not configured (NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL)."
      );
    }

    const items = input.items.filter((item) => item.id);
    if (items.length === 0) {
      throw new Error(
        "Cannot calculate delivery through WooCommerce without product IDs."
      );
    }

    let token: string | undefined;
    let nonce: string | undefined;
    const headers = () => ({
      "Content-Type": "application/json",
      ...(token ? { "Cart-Token": token } : {}),
      ...(nonce ? { Nonce: nonce } : {}),
    });

    const session = await fetch(`${storeUrl}/cart`, { cache: "no-store" });
    if (!session.ok) {
      throw new Error("Could not start a WooCommerce cart session.");
    }
    token = extractCartToken(session) ?? token;
    nonce = extractNonce(session) ?? nonce;

    for (const item of items) {
      const added = await fetch(`${storeUrl}/cart/add-item`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ id: Number(item.id), quantity: item.quantity }),
        cache: "no-store",
      });
      if (!added.ok) {
        const detail = await added.json().catch(() => null);
        throw new Error(
          (detail as { message?: string } | null)?.message ??
            `"${item.name}" could not be added for delivery.`
        );
      }
      token = extractCartToken(added) ?? token;
      nonce = extractNonce(added) ?? nonce;
    }

    const address = toStoreAddress(input.delivery);
    const updated = await fetch(`${storeUrl}/cart/update-customer`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        billing_address: address,
        shipping_address: address,
      }),
      cache: "no-store",
    });

    if (!updated.ok) {
      const detail = await updated.json().catch(() => null);
      throw new Error(
        (detail as { message?: string } | null)?.message ??
          "Could not calculate delivery for your address."
      );
    }

    const cart = (await updated.json()) as StoreCart;
    const minorUnit = cart.totals?.currency_minor_unit ?? 2;
    const currency = cart.totals?.currency_code ?? "NGN";

    const rates = (cart.shipping_rates ?? []).flatMap(
      (pkg) => pkg.shipping_rates ?? []
    );

    const quotes = rates
      .map((rate) => ({
        rateId: rate.rate_id,
        carrierName: rate.name,
        carrierSlug: rate.rate_id.split(":")[0] ?? rate.rate_id,
        service: rate.description || rate.name,
        amount: Number(rate.price) / 10 ** minorUnit,
        currency: currency as DeliveryQuote["currency"],
        deliveryTime: rate.delivery_time,
      }))
      .sort((a, b) => a.amount - b.amount);

    try {
      await fetch(`${storeUrl}/cart/items`, {
        method: "DELETE",
        headers: headers(),
        cache: "no-store",
      });
    } catch {
      // best-effort cleanup
    }

    return quotes;
  }

  async arrangeShipment(_input: {
    rateId: string;
    metadata?: Record<string, string>;
  }): Promise<ArrangedShipment> {
    return {
      shipmentId: "",
      status: "confirmed",
    };
  }
}