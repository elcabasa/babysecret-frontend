import { NextResponse } from "next/server";
import { z } from "zod";

import { getCustomerByEmail } from "@/lib/woocommerce-auth";
import { storeResetToken } from "@/lib/reset-token-store";
import { sendResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (parsed.success) {
      const email = parsed.data.email.toLowerCase().trim();
      const customer = await getCustomerByEmail(email);

      if (customer) {
        const token = await storeResetToken(email, customer.id);
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

        try {
          await sendResetEmail(email, resetUrl);
        } catch (error) {
          console.error("Forgot password: email send failed:", error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Could not process your request." },
      { status: 500 }
    );
  }
}
