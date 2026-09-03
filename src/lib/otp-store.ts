import {
  getCustomerByEmail,
  getCustomerMeta,
  updateCustomerMeta,
} from "@/lib/woocommerce-auth";

const OTP_TTL_MS = 10 * 60 * 1000;

// Stored as plain (non-underscore) keys because the WooCommerce REST API
// hides underscore-prefixed meta from responses.
const OTP_CODE_KEY = "babysecret_otp_code";
const OTP_EXPIRES_KEY = "babysecret_otp_expires";

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(
  email: string,
  code: string,
  customerId: number,
): Promise<void> {
  await updateCustomerMeta(customerId, [
    { key: OTP_CODE_KEY, value: code },
    { key: OTP_EXPIRES_KEY, value: String(Date.now() + OTP_TTL_MS) },
  ]);
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<number | null> {
  const customer = await getCustomerByEmail(email);
  if (!customer) return null;

  const storedCode = getCustomerMeta(customer, OTP_CODE_KEY);
  const expires = Number(getCustomerMeta(customer, OTP_EXPIRES_KEY) || "0");

  if (!storedCode) return null;

  if (expires <= Date.now()) {
    await clearOtpMeta(customer.id);
    return null;
  }

  if (storedCode !== code) return null;

  await clearOtpMeta(customer.id);
  return customer.id;
}

async function clearOtpMeta(customerId: number): Promise<void> {
  await updateCustomerMeta(customerId, [
    { key: OTP_CODE_KEY, value: "" },
    { key: OTP_EXPIRES_KEY, value: "" },
  ]);
}
