import { NextResponse } from "next/server";
import { z } from "zod";

import { setEmailVerified } from "@/lib/woocommerce-auth";
import { verifyOtp } from "@/lib/otp-store";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid verification details." },
        { status: 400 },
      );
    }

    // Guess backstop: bounded attempts per account independent of the
    // per-code lockout inside verifyOtp.
    const limit = checkRateLimit(
      requestKey(request, `otp-verify:${parsed.data.email.toLowerCase().trim()}`),
      10,
      10 * 60 * 1000,
    );

    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please request a new code." },
        { status: 429 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const verdict = await verifyOtp(email, parsed.data.code);

    if (verdict.status === "verified") {
      await setEmailVerified(verdict.customerId);

      return NextResponse.json({ success: true });
    }

    if (verdict.status === "locked") {
      return NextResponse.json(
        { message: "Too many attempts. Please request a new code." },
        { status: 429 },
      );
    }

    // Uniform failure: expired, invalid, and (deliberately) already-verified
    // accounts all answer the same way so verification state is not
    // enumerable through this endpoint.
    return NextResponse.json(
      { message: "Invalid or expired code." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { message: "Could not verify your email." },
      { status: 500 },
    );
  }
}
