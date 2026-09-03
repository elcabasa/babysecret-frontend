"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import {
  authenticateWooCommerce,
  getCustomerByEmail,
  WooCommerceAuthError,
} from "@/lib/woocommerce-auth";

const homeRedirect = `/?auth_success=${encodeURIComponent("Welcome back!")}`;

const GOOGLE_ACCOUNT_MESSAGE =
  "This account uses Google Sign-In. Please log in using the Google button.";

export async function loginAction(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");

  let user;
  try {
    ({ user } = await authenticateWooCommerce(email, password));
  } catch (error) {
    const customer = await getCustomerByEmail(email);
    const provider = customer?.meta_data?.find(
      (meta) => meta.key === "auth_provider",
    )?.value;

    if (provider === "google") {
      return { error: GOOGLE_ACCOUNT_MESSAGE };
    }

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
        case "ACCOUNT_NOT_FOUND":
          return { error: "No account was found for this email." };
        default:
          return { error: "Invalid email or password." };
      }
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
    const collision =
      error instanceof Error &&
      (error.message.includes("ACCOUNT_PASSWORD_COLLISION") ||
        error.message.includes("OAuthAccountNotLinked"));

    if (collision) {
      redirect("/login?error=ACCOUNT_PASSWORD_COLLISION");
    }

    if (error instanceof AuthError) {
      return;
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
