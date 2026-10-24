import "server-only";

/**
 * Bank-transfer receiving account (server side).
 *
 * The account is read from trusted server-only environment variables so the
 * receiving details live in one deployable place and can be rotated without a
 * code change. There are deliberately **no fallback or placeholder values**: if
 * a variable is missing or blank, `getBankDetails()` throws and the caller
 * surfaces a configuration error instead of showing a customer a wrong account
 * number.
 *
 * A receiving account is shown to customers by design, so it is not a secret —
 * but it must still be *correct*. A silent fallback here means money sent to
 * the wrong account, which is why nothing is hardcoded.
 *
 * The checkout response returns these details to the browser (see
 * `src/config/bank-public.ts` for the client-side read of the equivalent
 * `NEXT_PUBLIC_BANK_*` variables).
 */

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export class BankDetailsNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `Bank transfer is not configured. Missing environment variable(s): ${missing.join(", ")}.`,
    );

    this.name = "BankDetailsNotConfiguredError";
  }
}

/**
 * Returns the configured bank-transfer details.
 *
 * @throws {BankDetailsNotConfiguredError} when any variable is missing or blank.
 */
export function getBankDetails(): BankDetails {
  const bankName = process.env.MONIEPOINT_BANK_NAME?.trim() || "";
  const accountName = process.env.MONIEPOINT_ACCOUNT_NAME?.trim() || "";
  const accountNumber = process.env.MONIEPOINT_ACCOUNT_NUMBER?.trim() || "";

  const missing: string[] = [];

  if (!bankName) missing.push("MONIEPOINT_BANK_NAME");
  if (!accountName) missing.push("MONIEPOINT_ACCOUNT_NAME");
  if (!accountNumber) missing.push("MONIEPOINT_ACCOUNT_NUMBER");

  if (missing.length) {
    console.error(
      `[bank] Bank transfer is not configured. Missing environment variable(s): ${missing.join(", ")}.`,
    );

    throw new BankDetailsNotConfiguredError(missing);
  }

  return { bankName, accountName, accountNumber };
}