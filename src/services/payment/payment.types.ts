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
}

export interface PaymentProvider {
  initializePayment(input: PaymentInput): Promise<PaymentInitializationResult>;

  verifyPayment(
    reference: string,
    transactionId?: string,
  ): Promise<PaymentVerificationResult>;
}
