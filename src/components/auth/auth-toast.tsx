"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  clearAuthToast,
  getAuthToastServerSnapshot,
  getAuthToastSnapshot,
  subscribeAuthToast,
} from "@/lib/auth-toast";

const TOAST_DURATION_MS = 4000;

export function AuthToast() {
  const message = useSyncExternalStore(
    subscribeAuthToast,
    getAuthToastSnapshot,
    getAuthToastServerSnapshot,
  );

  useEffect(() => {
    if (!message) return;

    const hideTimer = setTimeout(() => clearAuthToast(), TOAST_DURATION_MS);
    return () => clearTimeout(hideTimer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-white/95 px-5 py-2 text-sm font-semibold text-green-700 shadow-lg"
    >
      {message}
    </div>
  );
}
