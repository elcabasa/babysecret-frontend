import { randomUUID } from "crypto";

import {
  getCustomerById,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";

export type ResetEntry = {
  token: string;
  customerId: number;
  email: string;
  expires: number;
};

const RESET_TTL_MS = 30 * 60 * 1000;

const RESET_TOKEN_KEY = "babysecret_reset_token";
const RESET_EXPIRES_KEY = "babysecret_reset_expires";

export async function storeResetToken(
  email: string,
  customerId: number
): Promise<string> {
  // Embedding the customer id lets `consumeResetToken` locate the customer
  // from a bare token without scanning every account.
  const token = `${customerId}.${randomUUID().replace(/-/g, "")}`;

  await updateCustomerMeta(customerId, [
    { key: RESET_TOKEN_KEY, value: token },
    { key: RESET_EXPIRES_KEY, value: String(Date.now() + RESET_TTL_MS) },
  ]);

  return token;
}

export async function verifyResetToken(token: string): Promise<ResetEntry | null> {
  const customerId = Number(token.split(".")[0]);
  if (!customerId || !Number.isFinite(customerId)) return null;

  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const storedToken = getCustomerMeta(customer, RESET_TOKEN_KEY);
  const expires = Number(getCustomerMeta(customer, RESET_EXPIRES_KEY) || "0");

  if (storedToken !== token || expires <= Date.now()) return null;

  return {
    token,
    customerId,
    email: customer.email.toLowerCase(),
    expires,
  };
}

export async function consumeResetToken(token: string): Promise<ResetEntry | null> {
  const entry = await verifyResetToken(token);
  if (!entry) return null;

  await updateCustomerMeta(entry.customerId, [
    { key: RESET_TOKEN_KEY, value: "" },
    { key: RESET_EXPIRES_KEY, value: "" },
  ]);

  return entry;
}