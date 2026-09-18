"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { GoogleButton } from "./google-button";

export function RegisterForm({
  googleEnabled = true,
}: {
  googleEnabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googleConflict, setGoogleConflict] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGoogleConflict(false);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      phone: form.get("phone") ? String(form.get("phone")) : undefined,
    };

    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not create your account.");
        setGoogleConflict(data.code === "GOOGLE_ACCOUNT");
        setPending(false);
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {googleConflict && googleEnabled && (
        <div className="flex flex-col gap-3 rounded-xl bg-blue-50 px-4 py-4">
          <p className="text-sm text-[#102a43]">
            Already have a Google account? Continue with Google below.
          </p>
          <GoogleButton enabled={googleEnabled} />
          <Link
            href="/login"
            className="text-center text-sm text-[#3051a0] hover:underline"
          >
            Or sign in with email and password
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
            First name
            <input
              name="firstName"
              required
              className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
            Last name
            <input
              name="lastName"
              required
              className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
            />
          </label>
        </div>

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
          Phone
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#3051a0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26407f] disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Create account"}
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

      <p className="mt-2 text-center text-sm text-[#334f6d]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#3051a0] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
