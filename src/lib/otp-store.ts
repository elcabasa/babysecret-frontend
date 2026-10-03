import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import {
  getCustomerByEmail,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";

/**
 * OTP handling.
 *
 * Security properties (all enforced here, not in callers):
 * - Only an HMAC-SHA256 of the code is ever stored (pepper from
 *   `OTP_PEPPER`, falling back to the server-only `AUTH_SECRET`). A Woo
 *   meta-database read never reveals a usable code.
 * - Comparison is constant-time with a length guard.
 * - Max 5 failed attempts per code, then the code is voided.
 * - 10-minute expiry, single use, cleared on success/expiry/lockout.
 * - Codes and hashes are never logged (callers must uphold this too).
 */

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Stored as plain (non-underscore) keys because the WooCommerce REST API
// hides underscore-prefixed meta from responses.
const OTP_HASH_KEY = "babysecret_otp_hash";
const OTP_EXPIRES_KEY = "babysecret_otp_expires";
const OTP_ATTEMPTS_KEY = "babysecret_otp_attempts";
const OTP_SENT_AT_KEY = "babysecret_otp_sent_at";

// Minimum gap between code sends to the same account.
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function pepper(): string {
  const value = process.env.OTP_PEPPER ?? process.env.AUTH_SECRET ?? "";

  if (!value) {
    throw new Error("OTP pepper is not configured.");
  }

  return value;
}

function hashCode(code: string): string {
  return createHmac("sha256", pepper()).update(code, "utf8").digest("hex");
}

function hashesEqual(storedHex: string, candidateHex: string): boolean {
  const left = Buffer.from(storedHex, "hex");
  const right = Buffer.from(candidateHex, "hex");

  if (left.length !== right.length || left.length === 0) return false;

  return timingSafeEqual(left, right);
}

export function generateOtp(): string {
  // randomInt is cryptographically secure; Math.random is not suitable here.
  return String(randomInt(100000, 1000000));
}

export async function storeOtp(
  email: string,
  code: string,
  customerId: number,
): Promise<void> {
  await updateCustomerMeta(customerId, [
    { key: OTP_HASH_KEY, value: hashCode(code) },
    { key: OTP_EXPIRES_KEY, value: String(Date.now() + OTP_TTL_MS) },
    { key: OTP_ATTEMPTS_KEY, value: "0" },
    { key: OTP_SENT_AT_KEY, value: String(Date.now()) },
  ]);
}

export type OtpVerdict =
  | { status: "verified"; customerId: number }
  | { status: "invalid" }
  | { status: "locked" }
  | { status: "expired" };

export async function verifyOtp(
  email: string,
  code: string,
): Promise<OtpVerdict> {
  const customer = await getCustomerByEmail(email);
  if (!customer) return { status: "invalid" };

  const storedHash = getCustomerMeta(customer, OTP_HASH_KEY);
  const expires = Number(getCustomerMeta(customer, OTP_EXPIRES_KEY) || "0");
  const attempts = Number(getCustomerMeta(customer, OTP_ATTEMPTS_KEY) || "0");

  if (!storedHash) return { status: "invalid" };

  if (expires <= Date.now()) {
    await clearOtpMeta(customer.id);
    return { status: "expired" };
  }

  if (Number.isFinite(attempts) && attempts >= MAX_ATTEMPTS) {
    await clearOtpMeta(customer.id);
    return { status: "locked" };
  }

  if (!hashesEqual(storedHash, hashCode(code))) {
    await updateCustomerMeta(customer.id, [
      { key: OTP_ATTEMPTS_KEY, value: String((Number.isFinite(attempts) ? attempts : 0) + 1) },
    ]);

    return { status: "invalid" };
  }

  await clearOtpMeta(customer.id);
  return { status: "verified", customerId: customer.id };
}

/**
 * Seconds remaining before another code may be sent. Zero means "send now".
 * Read from the same account meta so the cooldown survives restarts.
 */
export async function otpCooldownRemainingMs(email: string): Promise<number> {
  const customer = await getCustomerByEmail(email);
  if (!customer) return 0;

  const sentAt = Number(getCustomerMeta(customer, OTP_SENT_AT_KEY) || "0");
  if (!Number.isFinite(sentAt) || sentAt <= 0) return 0;

  return Math.max(0, sentAt + OTP_RESEND_COOLDOWN_MS - Date.now());
}

async function clearOtpMeta(customerId: number): Promise<void> {
  await updateCustomerMeta(customerId, [
    { key: OTP_HASH_KEY, value: "" },
    { key: OTP_EXPIRES_KEY, value: "" },
    { key: OTP_ATTEMPTS_KEY, value: "" },
    { key: OTP_SENT_AT_KEY, value: "" },
    // Legacy plaintext-code key (pre-hash migration): scrub if present.
    // Codes stored under it no longer verify — the customer requests a
    // fresh code instead.
    { key: "babysecret_otp_code", value: "" },
  ]);
}
