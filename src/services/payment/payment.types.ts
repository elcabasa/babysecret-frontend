export interface PaymentInput {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
  customerName?: string;
  phoneNumber?: string;
}

export type PaymentMethod = "paystack" | "flutterwave" | "bank_transfer";

export interface PaymentInitializationResult {
  status: "not-configured" | "initialized" | "awaiting_transfer";
  reference: string;
  authorizationUrl?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    reference: string;
  };
}

export interface PaymentVerificationResult {
  verified: boolean;
  reference: string;
  /**
   * Authoritative amount/currency as reported by the provider's verify API
   * (Paystack kobo → NGN, Flutterwave amount/currency). Absent when the
   * provider could not be verified. Callers must compare `amount` against
   * the WooCommerce order total themselves — verification alone never
   * implies the customer paid enough.
   */
  amount?: number;
  currency?: string;
}

export interface PaymentProvider {
  initializePayment(input: PaymentInput): Promise<PaymentInitializationResult>;

  verifyPayment(
    reference: string,
    transactionId?: string,
  ): Promise<PaymentVerificationResult>;
}
