/**
 * Client-safe read of the bank-transfer receiving account.
 *
 * The customer must be able to see where to send money, so these details are
 * public by nature and are exposed through `NEXT_PUBLIC_BANK_*` variables —
 * matching the server-only `MONIEPOINT_*` variables in `src/config/bank.ts`.
 *
 * There are no hardcoded defaults. If the variables are missing, the fields come
 * back empty and `awaiting-payment` renders a configuration error rather than
 * inventing an account number.
 *
 * This module must stay free of `server-only` imports — it is bundled into the
 * browser.
 */

export interface PublicBankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export function getPublicBankDetails(): PublicBankDetails {
  return {
    bankName: process.env.NEXT_PUBLIC_BANK_NAME?.trim() || "",
    accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME?.trim() || "",
    accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER?.trim() || "",
  };
}