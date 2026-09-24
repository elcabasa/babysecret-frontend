/**
 * Bank-transfer receiving account shown to customers at checkout.
 *
 * This is the single source of truth for the account details — both the
 * client UI (awaiting-payment page) and the server payment service read
 * from here, so the account can never drift out of sync.
 *
 * Note: a receiving account is public by nature (customers must see it to
 * pay you), so keeping it in code is not a secret leak. Payment/API
 * secrets (`PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, WooCommerce
 * keys, etc.) must still stay server-only in environment variables and
 * never appear here.
 */

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export const BANK_DETAILS: BankDetails = {
  bankName: "MoniePoint",
  accountName: "Flawless Cosmetics Limited",
  accountNumber: "8262328039",
};

/**
 * Returns the configured bank-transfer details.
 */
export function getBankDetails(): BankDetails {
  return BANK_DETAILS;
}
