"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import {
  authenticateWooCommerce,
  getCustomerByEmail,
} from "@/lib/woocommerce-auth";

const homeRedirect = `/?auth_success=${encodeURIComponent("Welcome back!")}`;

export async function loginAction(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  let user;
  try {
    ({ user } = await authenticateWooCommerce(email, password));
  } catch {
    const customer = await getCustomerByEmail(email);
    const provider = customer?.meta_data?.find(
      (meta) => meta.key === "auth_provider"
    )?.value;

    if (provider === "google") {
      return {
        error:
          "This account uses Google Sign-In. Please log in using the Google button.",
      };
    }

    return { error: "Invalid email or password." };
  }

  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: homeRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return {};
}

export async function googleAction(): Promise<void> {
  try {
    await signIn("google", { redirectTo: homeRedirect });
  } catch (error) {
    if (error instanceof AuthError) {
      return;
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
