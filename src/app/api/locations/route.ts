import { NextResponse } from "next/server";

import { nigeriaStates } from "@/data/nigeria-locations";

export async function GET() {
  return NextResponse.json({ states: nigeriaStates });
}
