import { NextResponse } from "next/server";

import { listTerminalCities } from "@/services/shipping/address-resolution";

/**
 * Canonical Terminal Africa delivery cities for a state.
 *
 * The checkout City / Delivery Area dropdown is populated from here — never
 * from the Nigerian LGA dataset — so `delivery_address.city` always carries
 * a Terminal-accepted value. City data is cached server-side (24h in-memory
 * TTL in address-resolution.ts); the `s-maxage` below lets CDNs help too.
 *
 * Terminal failures stay anonymous: the browser only ever sees a friendly
 * message, never provider internals.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim() || "Nigeria";
  const state = searchParams.get("state")?.trim() ?? "";

  if (!state) {
    return NextResponse.json(
      { success: false, message: "A state is required." },
      { status: 400 },
    );
  }

  try {
    const { state: canonicalState, cities } = await listTerminalCities(
      country,
      state,
    );

    return NextResponse.json(
      { success: true, state: canonicalState, cities },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Terminal cities error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not load delivery areas. Please try again.",
      },
      { status: 500 },
    );
  }
}
