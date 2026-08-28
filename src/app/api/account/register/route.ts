import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createWooCustomer,
  getCustomerByEmail,
} from "@/lib/woocommerce-auth";
import { generateOtp, storeOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please check your details and try again." },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password, phone } = parsed.data;
    const normalized = email.toLowerCase().trim();

    const existing = await getCustomerByEmail(normalized);
    if (existing) {
      const provider = existing.meta_data?.find(
        (meta) => meta.key === "auth_provider"
      )?.value;

      if (provider === "google") {
        return NextResponse.json(
          {
            message:
              "You already registered with Google. Please sign in with Google.",
            code: "GOOGLE_ACCOUNT",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

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
    storeOtp(normalized, code, Number(user.id));
    await sendOtpEmail(normalized, code);

    return NextResponse.json({ success: true, email: normalized });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Could not create your account." },
      { status: 500 }
    );
  }
}
