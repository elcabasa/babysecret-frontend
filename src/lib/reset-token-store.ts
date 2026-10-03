import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  getCustomerById,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";

export type ResetEntry = {
  customerId: number;
  email: string;
  expires: number;
};

/**
 * Opaque password-reset tokens.
 *
 * The token handed to the customer is `v1.<iv>.<ciphertext>.<tag>` (hex) —
 * the customer id sealed with AES-256-GCM under a server-only key. It
 * embeds NO account identifier in readable form and is useless without the
 * server secret. The stored record keeps only a SHA-256 hash of the full
 * token plus expiry, so a Woo meta-database read cannot be replayed either.
 *
 * Properties: 30-minute expiry, single use, consumed (invalidated) BEFORE
 * the password change is applied. Tokens, hashes, and passwords are never
 * logged.
 */

const RESET_TTL_MS = 30 * 60 * 1000;

const RESET_HASH_KEY = "babysecret_reset_hash";
const RESET_EXPIRES_KEY = "babysecret_reset_expires";

function sealKey(): Buffer {
  const pepper = process.env.OTP_PEPPER ?? process.env.AUTH_SECRET ?? "";

  if (!pepper) {
    throw new Error("Reset token secret is not configured.");
  }

  return createHash("sha256").update(pepper, "utf8").digest();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function sealCustomerId(customerId: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);

  const sealed = Buffer.concat([
    cipher.update(String(customerId), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("hex")}.${sealed.toString("hex")}.${tag.toString("hex")}`;
}

function openSealedToken(token: string): number | null {
  const parts = token.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") return null;

  try {
    const iv = Buffer.from(parts[1], "hex");
    const sealed = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");

    if (iv.length !== 12 || sealed.length === 0 || tag.length !== 16) {
      return null;
    }

    const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([
      decipher.update(sealed),
      decipher.final(),
    ]).toString("utf8");

    const customerId = Number(plain);

    return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
  } catch {
    return null;
  }
}

function hashesEqual(storedHex: string, candidateHex: string): boolean {
  const left = Buffer.from(storedHex, "hex");
  const right = Buffer.from(candidateHex, "hex");

  if (left.length !== right.length || left.length === 0) return false;

  return timingSafeEqual(left, right);
}

export async function storeResetToken(
  email: string,
  customerId: number,
): Promise<string> {
  const token = sealCustomerId(customerId);

  await updateCustomerMeta(customerId, [
    { key: RESET_HASH_KEY, value: hashToken(token) },
    { key: RESET_EXPIRES_KEY, value: String(Date.now() + RESET_TTL_MS) },
  ]);

  return token;
}

export async function verifyResetToken(
  token: string,
): Promise<ResetEntry | null> {
  const customerId = openSealedToken(token);
  if (!customerId) return null;

  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const storedHash = getCustomerMeta(customer, RESET_HASH_KEY);
  const expires = Number(getCustomerMeta(customer, RESET_EXPIRES_KEY) || "0");

  if (!storedHash || !hashesEqual(storedHash, hashToken(token))) return null;
  if (expires <= Date.now()) return null;

  return {
    customerId,
    email: customer.email.toLowerCase(),
    expires,
  };
}

export async function consumeResetToken(
  token: string,
): Promise<ResetEntry | null> {
  const entry = await verifyResetToken(token);
  if (!entry) return null;

  // Invalidate BEFORE the caller changes the password so the token can
  // never be reused — even if the password write that follows fails.
  await updateCustomerMeta(entry.customerId, [
    { key: RESET_HASH_KEY, value: "" },
    { key: RESET_EXPIRES_KEY, value: "" },
    // Legacy `customerId.token` format (pre-opaque migration): scrub.
    { key: "babysecret_reset_token", value: "" },
    { key: "babysecret_reset_expires", value: "" },
  ]);

  return entry;
}
