import type {
  PaymentInitializationResult,
  PaymentProvider,
  PaymentVerificationResult,
} from "@/services/payment/payment.types";

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

    return {
      verified:
        response.ok &&
        result.status === true &&
        result.data?.status === "success",
      reference,
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
    };
  }
}

export function getPaymentProvider(
  providerName?: "paystack" | "flutterwave",
): PaymentProvider {
  const provider = providerName || process.env.PAYMENT_PROVIDER;

  if (provider === "paystack") {
    return new PaystackPaymentProvider();
  }

  if (provider === "flutterwave") {
    return new FlutterwavePaymentProvider();
  }

  return new DemoPaymentProvider();
}
