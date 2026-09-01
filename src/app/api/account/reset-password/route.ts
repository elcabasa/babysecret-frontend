import { NextResponse } from "next/server";
import { z } from "zod";

import { setWooCustomerPassword } from "@/lib/woocommerce-auth";
import { consumeResetToken } from "@/lib/reset-token-store";

const schema = z.object({
  token: z.string().min(8),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid reset details." },
        { status: 400 }
      );
    }

    const entry = await consumeResetToken(parsed.data.token);

    if (!entry) {
      return NextResponse.json(
        { message: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await setWooCustomerPassword(entry.customerId, parsed.data.password);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Could not reset your password." },
      { status: 500 }
    );
  }
}
