"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction } from "@/lib/auth.actions";
import { GoogleButton } from "./google-button";

const errorMessages: Record<string, string> = {
  ACCOUNT_PASSWORD_COLLISION:
    "This email is registered with a password. Please sign in with your email and password.",
  OAuthAccountNotLinked:
    "This email is registered with a password. Please sign in with your email and password.",
  AccessDenied:
    "That sign-in could not be completed. Please try again.",
  Configuration:
    "Sign-in is temporarily unavailable. Please try again.",
  OAuthSignin: "Google sign-in is temporarily unavailable.",
  OAuthCallback: "Google sign-in could not be completed. Please try again.",
  OAuthCreateAccount:
    "We could not create an account with Google. Please try again.",
  Verification: "Sign-in is temporarily unavailable. Please try again.",
  Default: "Something went wrong. Please try again.",
};

export function LoginForm({
  error,
  googleEnabled = true,
}: {
  error?: string;
  googleEnabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    { error?: string },
    FormData
  >(loginAction, {});

  const message =
    state?.error ??
    (error ? (errorMessages[error] ?? errorMessages.Default) : null);

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#3051a0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26407f] disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-1 flex items-center gap-3 text-xs text-[#62809e]">
            <span className="h-px flex-1 bg-[#d6e0f0]" />
            or
            <span className="h-px flex-1 bg-[#d6e0f0]" />
          </div>

          <GoogleButton enabled={googleEnabled} />
        </>
      )}

      <div className="mt-2 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-[#3051a0] hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-[#3051a0] hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
