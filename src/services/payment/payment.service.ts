import type { PaymentProvider } from "@/services/payment/payment.types";

class DemoPaymentProvider implements PaymentProvider {
  async initializePayment(input: { email: string; amount: number; reference: string }) { return { status: "not-configured" as const, reference: input.reference }; }
  async verifyPayment(reference: string) { return { verified: false, reference }; }
}

export function getPaymentProvider(): PaymentProvider { return new DemoPaymentProvider(); }
