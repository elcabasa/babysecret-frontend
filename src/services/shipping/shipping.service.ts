import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingProvider,
} from "@/types/shipping";
import { TerminalShipProvider } from "@/services/shipping/tship.service";
import { WooCommerceShippingProvider } from "@/services/shipping/woocommerce.service";

const zones: Record<string, string[]> = {
  lagos: ["Lagos"],
  "south-west": ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
  "south-east": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  "south-south": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  "north-central": ["Benue", "FCT", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
  "north-east": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  "north-west": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
};

const zoneBaseFees: Record<string, number> = {
  lagos: 1500,
  "south-west": 1800,
  "south-east": 2800,
  "south-south": 3000,
  "north-central": 2200,
  "north-east": 3800,
  "north-west": 3600,
};

function zoneForState(state: string): string {
  const normalized = state.trim().toUpperCase();
  for (const [zone, states] of Object.entries(zones)) {
    if (states.some((name) => name.toUpperCase() === normalized)) return zone;
  }
  return "south-west";
}

function mockOptions(
  zone: string,
  totalWeight: number
): DeliveryQuote[] {
  const base = zoneBaseFees[zone] ?? 2200;
  const rounded = Math.round(base / 50) * 50;
  const surcharge = totalWeight > 1 ? Math.round(totalWeight) * 250 : 0;

  return [
    {
      rateId: `mock-${zone}-economy`,
      carrierName: "Konga Logistics",
      carrierSlug: "konga-express",
      service: "Economy",
      amount: rounded + surcharge,
      currency: "NGN",
      deliveryTime: "3–5 business days",
      deliveryEta: 259200,
    },
    {
      rateId: `mock-${zone}-standard`,
      carrierName: "Red Star Express",
      carrierSlug: "redstar",
      service: "Normal Delivery",
      amount: rounded + 1200 + surcharge,
      currency: "NGN",
      deliveryTime: "2–4 business days",
      deliveryEta: 172800,
    },
    {
      rateId: `mock-${zone}-express`,
      carrierName: "GIG Logistics",
      carrierSlug: "gig-logistics",
      service: "Same Zone Dispatch",
      amount: rounded + 2400 + surcharge,
      currency: "NGN",
      deliveryTime: "1–2 business days",
      deliveryEta: 86400,
    },
  ];
}

class MockShippingProvider implements ShippingProvider {
  totalWeight(items: DeliveryQuoteInput["items"]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0) * 0.4;
  }

  async getQuotes(input: DeliveryQuoteInput): Promise<DeliveryQuote[]> {
    return mockOptions(
      zoneForState(input.delivery.state),
      this.totalWeight(input.items)
    );
  }

  async arrangeShipment(input: {
    rateId: string;
    metadata?: Record<string, string>;
  }): Promise<ArrangedShipment> {
    const suffix = input.rateId.replace(/[^a-z0-9]/gi, "").slice(0, 8);

    return {
      shipmentId: `SH-MOCK-${suffix}-${Date.now().toString(36).toUpperCase()}`,
      trackingNumber: `MOCK-${suffix}-${Date.now().toString(36).toUpperCase()}`,
      status: "confirmed",
    };
  }
}

export function getShippingProviderName(): "tship" | "mock" | "woocommerce" {
  const provider = process.env.SHIPPING_PROVIDER;
  if (provider === "tship") return "tship";
  if (provider === "woocommerce") return "woocommerce";
  return "mock";
}

export function getShippingProvider(
  providerName?: "tship" | "mock" | "woocommerce"
): ShippingProvider {
  const provider = providerName || getShippingProviderName();

  if (provider === "tship") {
    return new TerminalShipProvider();
  }

  if (provider === "woocommerce") {
    return new WooCommerceShippingProvider();
  }

  return new MockShippingProvider();
}

export async function getDeliveryQuotes(
  input: DeliveryQuoteInput
): Promise<DeliveryQuote[]> {
  const provider = getShippingProvider();

  try {
    return await provider.getQuotes(input);
  } catch (error) {
    if (
      provider instanceof WooCommerceShippingProvider &&
      process.env.SHIPPING_FALLBACK === "mock"
    ) {
      return new MockShippingProvider().getQuotes(input);
    }
    throw error;
  }
}

export async function arrangeShipment(input: {
  rateId: string;
  metadata?: Record<string, string>;
}): Promise<ArrangedShipment> {
  return getShippingProvider().arrangeShipment(input);
}