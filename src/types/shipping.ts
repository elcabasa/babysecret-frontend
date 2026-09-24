export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  zip?: string;
}

export interface ParcelItemInput {
  id?: string;
  name: string;
  description?: string;
  value: number;
  weight: number;
  quantity: number;
}

export interface DeliveryQuote {
  rateId: string;
  carrierName: string;
  carrierSlug: string;
  carrierLogo?: string;
  service: string;
  amount: number;
  currency: "NGN";
  deliveryTime?: string;
  deliveryEta?: number;
  landsIn?: Date;
}

export interface DeliveryQuoteInput {
  pickup: ShippingAddress;
  delivery: ShippingAddress;
  items: ParcelItemInput[];
}

export interface ArrangedShipment {
  shipmentId: string;
  trackingNumber?: string;
  status: "draft" | "confirmed" | "pending" | "fulfilled";
}

export type ShippingProviderName = "tship" | "shipbubble" | "woocommerce";

export interface ShippingProvider {
  getQuotes(input: DeliveryQuoteInput): Promise<DeliveryQuote[]>;
  arrangeShipment(input: {
    rateId: string;
    metadata?: Record<string, string>;
  }): Promise<ArrangedShipment>;
}
