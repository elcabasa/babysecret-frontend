import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCustomerByEmail,
  getCustomerMeta,
  setEmailVerified,
} from "@/lib/woocommerce-auth";
import { verifyOtp } from "@/lib/otp-store";

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

    const email = parsed.data.email.toLowerCase().trim();
    const customerId = await verifyOtp(email, parsed.data.code);

    if (!customerId) {
      const existing = await getCustomerByEmail(email);

      if (existing && getCustomerMeta(existing, "email_verified") === "true") {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { message: "Invalid or expired code." },
        { status: 400 },
      );
    }

    await setEmailVerified(customerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { message: "Could not verify your email." },
      { status: 500 },
    );
  }
}
