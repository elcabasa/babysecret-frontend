type OtpEntry = {
  code: string;
  customerId: number;
  expires: number;
};

const store = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000;

export function storeOtp(email: string, code: string, customerId: number): void {
  store.set(email.toLowerCase(), {
    code,
    customerId,
    expires: Date.now() + OTP_TTL_MS,
  });
}

export function verifyOtp(email: string, code: string): number | null {
  const entry = store.get(email.toLowerCase());

  if (!entry) return null;

  if (Date.now() > entry.expires) {
    store.delete(email.toLowerCase());
    return null;
  }

  if (entry.code !== code) return null;

  store.delete(email.toLowerCase());
  return entry.customerId;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
