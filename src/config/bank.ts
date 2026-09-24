/**
 * Public bank-transfer details shown to customers at checkout.
 *
 * The application uses ONLY these three environment variables — there are
 * no fallback or default values anywhere. A receiving account must be
 * visible to the customer to complete a transfer, so these are read from
 * `NEXT_PUBLIC_*` variables (exposed to the browser by design):
 *
 *   NEXT_PUBLIC_BANK_NAME
 *   NEXT_PUBLIC_BANK_ACCOUNT_NAME
 *   NEXT_PUBLIC_BANK_ACCOUNT_NUMBER
 *
 * If any required variable is missing, `getBankDetails()` throws a clear
 * error instead of silently substituting another value.
 *
 * NEVER put API secrets here. `PAYSTACK_SECRET_KEY`,
 * `FLUTTERWAVE_SECRET_KEY`, WooCommerce keys, etc. stay server-only
 * (no `NEXT_PUBLIC_` prefix) and are only read in API routes / services.
 */

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

const REQUIRED_BANK_ENV_VARS = [
  "NEXT_PUBLIC_BANK_NAME",
  "NEXT_PUBLIC_BANK_ACCOUNT_NAME",
  "NEXT_PUBLIC_BANK_ACCOUNT_NUMBER",
] as const;

/**
 * Reads the configured bank-transfer details directly from the environment.
 * Throws a descriptive error listing every missing variable — never falls
 * back to placeholder values.
 */
export function getBankDetails(): BankDetails {
  const bankName = process.env.NEXT_PUBLIC_BANK_NAME;
  const accountName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME;
  const accountNumber = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER;

  const missing = REQUIRED_BANK_ENV_VARS.filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Bank transfer is not configured. Missing required environment variable(s): ${missing.join(", ")}.`,
    );
  }

  return {
    bankName: bankName as string,
    accountName: accountName as string,
    accountNumber: accountNumber as string,
  };
}
