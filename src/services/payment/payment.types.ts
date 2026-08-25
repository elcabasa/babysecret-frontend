export interface PaymentInput {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
  customerName?: string;
  phoneNumber?: string;
}

export interface PaymentInitializationResult {
  status: "not-configured" | "initialized";
  reference: string;
  authorizationUrl?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  reference: string;
}

export interface PaymentProvider {
  initializePayment(
    input: PaymentInput
  ): Promise<PaymentInitializationResult>;

  verifyPayment(
    reference: string,
    transactionId?: string
  ): Promise<PaymentVerificationResult>;
}