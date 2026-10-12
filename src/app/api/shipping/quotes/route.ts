import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultPickupAddress } from "@/services/shipping/tship.service";
import {
  checkNigeriaTerminalCity,
  isNigeriaCountry,
} from "@/services/shipping/address-resolution";
import {
  DEFAULT_PARCEL_ITEM_WEIGHT_KG,
  resolveParcelWeights,
} from "@/services/shipping/weight.service";
import { getDeliveryQuotes } from "@/services/shipping/shipping.service";
import type { ParcelItemInput } from "@/types/shipping";

const quoteSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  country: z.string().min(2),
  state: z.string().min(2),
  city: z.string().min(2),
  // LGA / Area is informational only — appended to the street lines for the
  // courier, never used as the Terminal delivery city.
  lga: z.string().max(100).optional().default(""),
  address: z.string().min(5),
  apartment: z.string().optional(),
  zip: z.string().trim().min(3).max(20),
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        variantId: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid delivery information.",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { items, ...customer } = parsed.data;

    /*
     * Nigerian destinations must use a Terminal canonical city. An LGA such
     * as "Eti-Osa" sent as the city is rejected here with a friendly message
     * instead of reaching Terminal. A Terminal outage fails OPEN to the
     * normal quote attempt (no rates → friendly fallback).
     */
    if (isNigeriaCountry(customer.country)) {
      const check = await checkNigeriaTerminalCity(
        customer.state,
        customer.city,
      );

      if (check.status === "unsupported") {
        return NextResponse.json(
          {
            message:
              "Please select a City / Delivery Area from the list to calculate delivery.",
          },
          { status: 400 },
        );
      }
    }

    /*
     * Resolve authoritative WooCommerce weights before Terminal Africa sees the
     * parcel. The request schema has no weight field, so a browser cannot
     * override the server-resolved value.
     */
    const resolvedWeights = await resolveParcelWeights(
      items.map((item, index) => ({
        productId:
          item.id !== undefined ? String(item.id) : `request-item-${index + 1}`,
        variantId:
          item.variantId !== undefined ? String(item.variantId) : undefined,
        quantity: item.quantity,
      })),
    );

    console.info("[shipping] Resolved parcel weights", {
      items: resolvedWeights.items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        unitWeightKg: item.unitWeightKg,
        quantity: item.quantity,
        lineWeightKg: item.lineWeightKg,
        source: item.source,
      })),
      totalParcelWeightKg: resolvedWeights.totalParcelWeightKg,
    });

    const parcelItems: ParcelItemInput[] = items.map((item, index) => ({
      id: item.id !== undefined ? String(item.id) : undefined,
      name: item.name,
      value: item.price * item.quantity,
      weight:
        resolvedWeights.items[index]?.unitWeightKg ??
        DEFAULT_PARCEL_ITEM_WEIGHT_KG,
      quantity: item.quantity,
    }));

    const delivery = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      line1: customer.address,
      // LGA rides along as street-level context only; the Terminal city
      // stays exactly what the customer selected from the canonical list.
      line2: [customer.apartment, customer.lga]
        .map((part) => part?.trim() ?? "")
        .filter(Boolean)
        .join(", "),
      city: customer.city,
      state: customer.state,
      country: customer.country,
      zip: customer.zip,
    };

    const quotes = await getDeliveryQuotes({
      pickup: defaultPickupAddress(),
      delivery,
      items: parcelItems,
    });

    return NextResponse.json({ success: true, quotes });
  } catch (error) {
    console.error("Delivery quote error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch delivery rates.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
