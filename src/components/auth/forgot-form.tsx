"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError("Could not process your request.");
        setPending(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-xl bg-green-50 px-4 py-4 text-sm text-green-800">
        If an account exists for <strong>{email}</strong>, we have sent a
        password reset link. Please check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-[#102a43]">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          autoComplete="email"
          className="rounded-xl border border-[#d6e0f0] bg-white px-4 py-3 outline-none focus:border-[#3051a0]"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#3051a0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26407f] disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
