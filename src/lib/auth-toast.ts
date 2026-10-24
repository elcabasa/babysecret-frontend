export const AUTH_TOAST_KEY = "auth_toast";

export const AUTH_WELCOME_MESSAGE = "Welcome back!";

const TOAST_TTL_MS = 10 * 60 * 1000;

type AuthToastSnapshot = string | null;

const listeners = new Set<() => void>();

function readStoredAuthToast(): AuthToastSnapshot {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(AUTH_TOAST_KEY);
    if (!stored) return null;

    const entry = JSON.parse(stored) as {
      message?: unknown;
      expires?: unknown;
    };

    if (
      typeof entry.message !== "string" ||
      typeof entry.expires !== "number" ||
      entry.expires <= Date.now()
    ) {
      sessionStorage.removeItem(AUTH_TOAST_KEY);
      return null;
    }

    return entry.message;
  } catch {
    return null;
  }
}

export function queueAuthToast(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    AUTH_TOAST_KEY,
    JSON.stringify({ message, expires: Date.now() + TOAST_TTL_MS }),
  );
}

export function subscribeAuthToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthToastSnapshot(): AuthToastSnapshot {
  return readStoredAuthToast();
}

export function getAuthToastServerSnapshot(): AuthToastSnapshot {
  return null;
}

export function clearAuthToast(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_TOAST_KEY);
  listeners.forEach((listener) => listener());
}
