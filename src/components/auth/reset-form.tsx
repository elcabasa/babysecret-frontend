"use client";

import { useState } from "react";
import Link from "next/link";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not reset your password.");
        setPending(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-green-50 px-4 py-4 text-sm text-green-800">
          Your password has been reset. You can now sign in.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-[#3051a0] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#26407f]"
        >
          Sign in
        </Link>
      </div>
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
        New password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        {pending ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
