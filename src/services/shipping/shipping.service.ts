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

/*
 * Customer-facing shipping providers.
 *
 * Terminal Africa ("tship") is currently the ONLY enabled provider.
 * Shipbubble's implementation (shipbubble.service.ts) is fully intact but
 * hidden from the customer flow — no Shipbubble APIs are called and no
 * Shipbubble options or errors are shown.
 *
 * To re-enable Shipbubble later (e.g. once the account is approved for live
 * mode), add "shipbubble" to this list. No other code changes needed.
 */
export const ENABLED_SHIPPING_PROVIDERS: ShippingProviderName[] = ["tship"];

export function getShippingProviderName(): ShippingProviderName {
  const provider = process.env.SHIPPING_PROVIDER;
  if (
    (provider === "shipbubble" || provider === "woocommerce") &&
    ENABLED_SHIPPING_PROVIDERS.includes(provider)
  ) {
    return provider;
  }
  return "tship";
}

export function getShippingProvider(
  providerName?: ShippingProviderName,
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
  input: DeliveryQuoteInput,
): Promise<DeliveryQuote[]> {
  // Quotes come ONLY from the active enabled provider (Terminal Africa).
  // The previous automatic Shipbubble fallback on Terminal errors is
  // disabled — Shipbubble is only used again once re-enabled in
  // ENABLED_SHIPPING_PROVIDERS above. Its implementation is untouched.
  const providerName = getShippingProviderName();

  return getShippingProvider(providerName).getQuotes(input);
}

export async function arrangeShipment(input: {
  rateId: string;
  metadata?: Record<string, string>;
}): Promise<ArrangedShipment> {
  // "sb:" rate ids only exist on legacy Shipbubble orders or once Shipbubble
  // is re-enabled. With Terminal-only quotes this branch is unreachable, so
  // no Shipbubble API requests are made from the current checkout flow.
  const provider = input.rateId.startsWith("sb:")
    ? new ShipbubbleShippingProvider()
    : getShippingProvider();

  return provider.arrangeShipment(input);
}
