type ResetEntry = {
  token: string;
  customerId: number;
  email: string;
  expires: number;
};

const store = new Map<string, ResetEntry>();

const RESET_TTL_MS = 30 * 60 * 1000;

export function storeResetToken(
  email: string,
  customerId: number
): string {
  const token =
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  store.set(token, {
    token,
    customerId,
    email: email.toLowerCase(),
    expires: Date.now() + RESET_TTL_MS,
  });
  return token;
}

export function verifyResetToken(token: string): ResetEntry | null {
  const entry = store.get(token);

  if (!entry) return null;

  if (Date.now() > entry.expires) {
    store.delete(token);
    return null;
  }

  return entry;
}

export function consumeResetToken(token: string): ResetEntry | null {
  const entry = verifyResetToken(token);
  if (entry) store.delete(token);
  return entry;
}
