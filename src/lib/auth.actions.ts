"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import {
  authenticateWooCommerce,
  WooCommerceAuthError,
} from "@/lib/woocommerce-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const homeRedirect = "/";

// Uniform authentication failure: identical message whether the account is
// missing, unverified, Google-linked, or the password is wrong, so login
// responses cannot enumerate accounts.
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function loginAction(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");

  // Credential-stuffing backstop (per account + IP).
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(
    `login:${ip}:${email}`,
    10,
    10 * 60 * 1000,
  );

  if (!limit.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  let user;
  try {
    ({ user } = await authenticateWooCommerce(email, password));
  } catch (error) {
    if (error instanceof WooCommerceAuthError) {
      switch (error.code) {
        case "AUTH_ENDPOINT_NOT_FOUND":
        case "AUTH_SERVER_ERROR":
          return {
            error:
              "The store sign-in service is not available. Please try again later or contact support.",
          };
        case "AUTH_NETWORK_ERROR":
          return {
            error:
              "We could not reach the store. Please check your connection and try again.",
          };
        default:
          return { error: INVALID_CREDENTIALS_MESSAGE };
      }
    }

    return { error: INVALID_CREDENTIALS_MESSAGE };
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
  // The UI hides the Google button when the flag is off; enforce it here too
  // so the provider cannot be invoked directly with the flag disabled.
  if (process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED !== "true") {
    return;
  }

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
