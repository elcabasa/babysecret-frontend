import { NextResponse } from "next/server";
import { z } from "zod";

import { sendOtpEmail } from "@/lib/email";
import { generateOtp, storeOtp } from "@/lib/otp-store";
import { getCustomerByEmail } from "@/lib/woocommerce-auth";

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
    const customer = await getCustomerByEmail(email);

    if (!customer) {
      return NextResponse.json({ success: true });
    }

    const isVerified =
      customer.meta_data?.find((meta) => meta.key === "email_verified")
        ?.value === "true";

    if (isVerified) {
      return NextResponse.json(
        { message: "This email is already verified." },
        { status: 409 },
      );
    }

    const code = generateOtp();
    await storeOtp(email, code, customer.id);

    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      console.error("Resend OTP: email send failed:", error);
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
