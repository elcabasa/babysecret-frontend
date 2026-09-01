import type {
  ArrangedShipment,
  DeliveryQuote,
  DeliveryQuoteInput,
  ShippingProvider,
  ShippingProviderName,
} from "@/types/shipping";
import { TerminalShipProvider } from "@/services/shipping/tship.service";
import { WooCommerceShippingProvider } from "@/services/shipping/woocommerce.service";
import { ShipbubbleShippingProvider } from "@/services/shipping/shipbubble.service";

export function getShippingProviderName(): ShippingProviderName {
  const provider = process.env.SHIPPING_PROVIDER;
  if (provider === "shipbubble") return "shipbubble";
  if (provider === "woocommerce") return "woocommerce";
  return "tship";
}

export function getShippingProvider(
  providerName?: ShippingProviderName
): ShippingProvider {
  const provider = providerName ?? getShippingProviderName();

  if (provider === "shipbubble") {
    return new ShipbubbleShippingProvider();
  }

  if (provider === "woocommerce") {
    return new WooCommerceShippingProvider();
  }

  return new TerminalShipProvider();
}

export async function getDeliveryQuotes(
  input: DeliveryQuoteInput
): Promise<DeliveryQuote[]> {
  const providerName = getShippingProviderName();

  if (providerName === "tship" && process.env.SHIPPUBBLE_API_KEY) {
    try {
      return await new TerminalShipProvider().getQuotes(input);
    } catch {
      return new ShipbubbleShippingProvider().getQuotes(input);
    }
  }

  return getShippingProvider(providerName).getQuotes(input);
}

export async function arrangeShipment(input: {
  rateId: string;
  metadata?: Record<string, string>;
}): Promise<ArrangedShipment> {
  const provider = input.rateId.startsWith("sb:")
    ? new ShipbubbleShippingProvider()
    : getShippingProvider();

  return provider.arrangeShipment(input);
}