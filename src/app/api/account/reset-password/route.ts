import { NextResponse } from "next/server";
import { z } from "zod";

import { setWooCustomerPassword } from "@/lib/woocommerce-auth";
import { consumeResetToken } from "@/lib/reset-token-store";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid reset details." },
        { status: 400 },
      );
    }

    const limit = checkRateLimit(requestKey(request, "reset"), 10, 10 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    // Consumed (invalidated) BEFORE the password change is applied, so the
    // token can never be reused — even if the write below fails.
    const entry = await consumeResetToken(parsed.data.token);

    if (!entry) {
      return NextResponse.json(
        { message: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    await setWooCustomerPassword(entry.customerId, parsed.data.password);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Could not reset your password." },
      { status: 500 },
    );
  }
}
