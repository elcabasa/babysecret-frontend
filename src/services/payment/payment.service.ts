import type {
  PaymentInitializationResult,
  PaymentMethod,
  PaymentProvider,
  PaymentVerificationResult,
} from "@/services/payment/payment.types";
import { getBankDetails } from "@/config/bank";

class DemoPaymentProvider implements PaymentProvider {
  async initializePayment(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    customerName?: string;
    phoneNumber?: string;
  }): Promise<PaymentInitializationResult> {
    return {
      status: "not-configured",
      reference: input.reference,
    };
  }

  async verifyPayment(
    reference: string,
    _transactionId?: string,
  ): Promise<PaymentVerificationResult> {
    return {
      verified: false,
      reference,
    };
  }
}

class PaystackPaymentProvider implements PaymentProvider {
  private secretKey = process.env.PAYSTACK_SECRET_KEY;

  async initializePayment(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
  }): Promise<PaymentInitializationResult> {
    if (!this.secretKey) {
      throw new Error("Paystack secret key is not configured.");
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: input.email,
          amount: Math.round(input.amount * 100),
          reference: input.reference,
          callback_url: input.callbackUrl,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
      throw new Error(
        result.message ||
          `Paystack initialization failed with status ${response.status}`,
      );
    }

    return {
      status: "initialized",
      reference: input.reference,
      authorizationUrl: result.data.authorization_url,
    };
  }

  async verifyPayment(
    reference: string,
    _transactionId?: string,
  ): Promise<PaymentVerificationResult> {
    if (!this.secretKey) {
      throw new Error("Paystack secret key is not configured.");
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const result = await response.json();

    const verified =
      response.ok &&
      result.status === true &&
      result.data?.status === "success";

    return {
      verified,
      reference,
      // Paystack reports minor units (kobo for NGN).
      amount:
        typeof result.data?.amount === "number"
          ? result.data.amount / 100
          : undefined,
      currency:
        typeof result.data?.currency === "string"
          ? result.data.currency
          : undefined,
    };
  }
}

class FlutterwavePaymentProvider implements PaymentProvider {
  private secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  async initializePayment(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    customerName?: string;
    phoneNumber?: string;
  }): Promise<PaymentInitializationResult> {
    if (!this.secretKey) {
      throw new Error("Flutterwave secret key is not configured.");
    }

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: "NGN",
        redirect_url: input.callbackUrl,
        customer: {
          email: input.email,
          name: input.customerName,
          phonenumber: input.phoneNumber,
        },
        customizations: {
          title: "BabySecret Payment",
        },
      }),
    });

    const result = await response.json();

    if (!response.ok || result.status !== "success" || !result.data?.link) {
      throw new Error(
        result.message || "Could not initialize Flutterwave payment.",
      );
    }

    return {
      status: "initialized",
      reference: input.reference,
      authorizationUrl: result.data.link,
    };
  }

  async verifyPayment(
    reference: string,
    transactionId?: string,
  ): Promise<PaymentVerificationResult> {
    if (!this.secretKey) {
      throw new Error("Flutterwave secret key is not configured.");
    }

    if (!transactionId) {
      return {
        verified: false,
        reference,
      };
    }

    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
        transactionId,
      )}/verify`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();

    const verified =
      response.ok &&
      result.status === "success" &&
      result.data?.status === "successful" &&
      result.data?.tx_ref === reference &&
      result.data?.currency === "NGN";

    return {
      verified,
      reference,
      amount:
        typeof result.data?.amount === "number"
          ? result.data.amount
          : Number(result.data?.amount) || undefined,
      currency:
        typeof result.data?.currency === "string"
          ? result.data.currency
          : undefined,
    };
  }
}

export function getPaymentProvider(
  providerName?: PaymentMethod,
): PaymentProvider {
  const provider = providerName || process.env.PAYMENT_PROVIDER;

  if (provider === "paystack") {
    return new PaystackPaymentProvider();
  }

  if (provider === "flutterwave") {
    return new FlutterwavePaymentProvider();
  }

  if (provider === "bank_transfer") {
    return new BankTransferPaymentProvider();
  }

  return new DemoPaymentProvider();
}

/**
 * Authoritative payment sufficiency check. Every automatic confirmation path
 * (callback verification, webhooks) must pass through here before an order
 * may be marked paid:
 *
 * - provider reports success (`verified`)
 * - provider reference matches the order's payment reference
 * - currency matches the store currency (NGN)
 * - provider-reported amount covers the WooCommerce order total
 *
 * Amounts come from the provider's verify API, never the browser. Bank
 * transfer has no automatic path and can never satisfy this check.
 */
export function isSufficientPayment(input: {
  verification: PaymentVerificationResult;
  expectedReference: string;
  orderTotal: number;
  orderCurrency?: string;
}): boolean {
  const currency = (input.orderCurrency ?? "NGN").toUpperCase();
  const paid = input.verification.amount;
  const paidCurrency = (input.verification.currency ?? "").toUpperCase();

  return (
    input.verification.verified === true &&
    input.verification.reference === input.expectedReference &&
    paidCurrency === currency &&
    typeof paid === "number" &&
    Number.isFinite(paid) &&
    Number.isFinite(input.orderTotal) &&
    input.orderTotal > 0 &&
    paid >= input.orderTotal
  );
}

class BankTransferPaymentProvider implements PaymentProvider {
  // Receiving-account details are resolved from trusted server-only
  // configuration (src/config/bank.ts → MONIEPOINT_*). These are shown to
  // customers, not API secrets, but there is no hardcoded fallback: an
  // unconfigured account must fail loudly rather than show a wrong number.
  async initializePayment(input: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    customerName?: string;
    phoneNumber?: string;
  }): Promise<PaymentInitializationResult> {
    const bankDetails = getBankDetails();

    return {
      status: "awaiting_transfer",
      reference: input.reference,
      bankDetails: {
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        amount: input.amount,
        reference: input.reference,
      },
    };
  }

  async verifyPayment(
    reference: string,
    _transactionId?: string,
  ): Promise<PaymentVerificationResult> {
    // Manual bank transfer - cannot auto-verify
    // Order remains pending until admin manually confirms
    return {
      verified: false,
      reference,
    };
  }
}
