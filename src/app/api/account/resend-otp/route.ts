import { NextResponse } from "next/server";
import { z } from "zod";

import { sendOtpEmail } from "@/lib/email";
import { generateOtp, otpCooldownRemainingMs, storeOtp } from "@/lib/otp-store";
import { getCustomerByEmail } from "@/lib/woocommerce-auth";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Enter a valid email." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Abuse backstop independent of the per-account send cooldown below.
    const limit = checkRateLimit(
      requestKey(request, `otp-resend:${email}`),
      5,
      60 * 60 * 1000,
    );

    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const customer = await getCustomerByEmail(email);

    if (!customer) {
      return NextResponse.json({ success: true });
    }

    const isVerified =
      customer.meta_data?.find((meta) => meta.key === "email_verified")
        ?.value === "true";

    // Uniform success either way: verified state stays unenumerable, and no
    // code is mailed to an already-verified account.
    if (!isVerified) {
      const cooldownMs = await otpCooldownRemainingMs(email);

      if (cooldownMs > 0) {
        return NextResponse.json(
          { message: "Please wait before requesting another code." },
          { status: 429 },
        );
      }

      const code = generateOtp();
      await storeOtp(email, code, customer.id);

      try {
        await sendOtpEmail(email, code);
      } catch (error) {
        console.error("Resend OTP: email send failed:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { message: "Could not resend the code." },
      { status: 500 },
    );
  }
}
