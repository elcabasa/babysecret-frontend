import { NextResponse } from "next/server";

import { toPickupLocationSummaries } from "@/config/pickup";

/**
 * Returns the configured Baby Secret pickup locations.
 *
 * The browser never imports `src/config/pickup` directly for rendering data —
 * it fetches from here, so locations and their configured fees stay owned by
 * the server config and cannot drift out of sync with what `/api/checkout`
 * charges.
 */
export async function GET() {
  const locations = toPickupLocationSummaries();

  return NextResponse.json({ success: true, locations });
}