import { NextResponse } from "next/server";
import { z } from "zod";

import { createWooCustomer, getCustomerByEmail } from "@/lib/woocommerce-auth";
import { generateOtp, storeOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";

const schema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  phone: z.string().min(6).max(30),
});

/*
 * Uniform responses: every outcome below answers the same success shape so
 * callers cannot enumerate registered emails (including whether an address
 * belongs to a Google-linked account). The client always advances to the
 * verification step; accounts that already exist simply receive no new code.
 */
const REGISTERED = { success: true };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please check your details and try again." },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, password, phone } = parsed.data;
    const normalized = email.toLowerCase().trim();

    const limit = checkRateLimit(
      requestKey(request, `register:${normalized}`),
      5,
      60 * 60 * 1000,
    );

    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const existing = await getCustomerByEmail(normalized);

    if (!existing) {
      try {
        const user = await createWooCustomer({
          email: normalized,
          password,
          firstName,
          lastName,
          phone,
          authProvider: "password",
          emailVerified: false,
        });

        const code = generateOtp();
        await storeOtp(normalized, code, Number(user.id));

        try {
          await sendOtpEmail(normalized, code);
        } catch (error) {
          console.error("Register: OTP email send failed:", error);
        }
      } catch {
        // TOCTOU: another request may have created the account between the
        // lookup above and the create call. An account that now exists is
        // the uniform-success path, not an error.
        const raced = await getCustomerByEmail(normalized).catch(() => null);

        if (!raced) {
          console.error("Register error: account creation failed");
          return NextResponse.json(
            { message: "Could not create your account." },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ ...REGISTERED, email: normalized });
  } catch {
    // Static message only: WooCommerce error text can echo the email back.
    console.error("Register error: account creation failed");
    return NextResponse.json(
      { message: "Could not create your account." },
      { status: 500 },
    );
  }
}
