import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultPickupAddress, defaultItemWeightKg } from "@/services/shipping/tship.service";
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
  address: z.string().min(5),
  apartment: z.string().optional(),
  zip: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid delivery information.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items, ...customer } = parsed.data;

    const parcelItems: ParcelItemInput[] = items.map((item) => ({
      id: item.id !== undefined ? String(item.id) : undefined,
      name: item.name,
      value: item.price * item.quantity,
      weight: defaultItemWeightKg,
      quantity: item.quantity,
    }));

    const delivery = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      line1: customer.address,
      line2: customer.apartment,
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