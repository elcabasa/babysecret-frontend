"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyEmailForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Invalid code.");
        setPending(false);
        return;
      }

      router.push("/login?verified=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function resendCode() {
    setError(null);
    setResent(false);
    setResending(true);

    try {
      const response = await fetch("/api/account/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not resend the code.");
      } else {
        setResent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {resent && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          A new code has been sent.
        </p>
      )}

      <p className="text-sm text-[#334f6d]">
        We sent a 6-digit code to <strong>{email}</strong>.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
        Verification code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          required
          className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 text-center tracking-[0.5em] outline-none focus:border-[#3051a0]"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#3051a0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26407f] disabled:opacity-60"
      >
        {pending ? "Verifying..." : "Verify email"}
      </button>

      <button
        type="button"
        onClick={resendCode}
        disabled={resending}
        className="text-center text-sm text-[#3051a0] hover:underline disabled:opacity-60"
      >
        {resending ? "Sending..." : "Resend code"}
      </button>
    </form>
  );
}
