"use client";

import { useFormStatus } from "react-dom";

import { googleAction } from "@/lib/auth.actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.29a12 12 0 0 0 0 10.8l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A12 12 0 0 0 12 0 12 12 0 0 0 1.29 6.6l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-[#d6e0f0] bg-white px-5 py-3 text-sm font-semibold text-[#102a43] transition hover:bg-[#f3f7ff] disabled:opacity-60"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}

export function GoogleButton({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;

  return (
    <form action={googleAction}>
      <Submit />
    </form>
  );
}
