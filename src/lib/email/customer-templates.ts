import { renderEmail, ORDER_EMAIL_FOOTER } from "@/lib/email/layout";
import type { OrderEmailContext, RenderedEmail } from "@/lib/email/types";

/**
 * Customer-facing custom Next.js emails.
 *
 * WooCommerce + FluentSMTP owns canonical order-lifecycle mail for order
 * creation/admin notification, processing, completion, cancellation, and
 * failure. This module contains only custom application messages WooCommerce
 * does not send: bank-transfer awaiting-payment instructions and optional
 * shipping-plugin "shipped" notifications.
 */

function orderCta(context: OrderEmailContext) {
  return context.orderUrl
    ? { url: context.orderUrl, label: "View your order" }
    : undefined;
}

/** Order received — sent the moment the order is created. */
export function orderReceivedEmail(context: OrderEmailContext): RenderedEmail {
  const rendered = renderEmail({
    preheader: `Thanks for your order, ${context.customerName}.`,
    title: "We've received your order",
    body: [
      "Thank you for shopping with Baby Secret. We've received your order.",
      context.fulfillment.method === "pickup"
        ? "We'll let you know as soon as your order is ready for collection."
        : "We'll let you know as soon as your parcel is on its way.",
    ],
    context,
    includeOrder: true,
    cta: orderCta(context),
    footerNote: ORDER_EMAIL_FOOTER,
  });

  return {
    ...rendered,
    subject: `Order #${context.orderNumber} received — Baby Secret`,
  };
}

/** Payment awaiting verification — bank transfer orders start here. */
export function paymentAwaitingEmail(
  context: OrderEmailContext,
): RenderedEmail {
  const transferInstructions = context.bankAccount
    ? [
        `Please transfer the Total shown below to:\nBank: ${context.bankAccount.bankName}\nAccount name: ${context.bankAccount.accountName}\nAccount number: ${context.bankAccount.accountNumber}`,
        `Put this payment reference in your transfer narration/description so we can match it quickly: ${context.reference}`,
      ]
    : [
        "Your exact transfer details are shown on the awaiting-payment page for this order.",
      ];

  const rendered = renderEmail({
    preheader: "We're waiting for your bank transfer.",
    title: "We're waiting for your payment",
    body: [
      "Your order has been received and we're holding it while we wait for your bank transfer to arrive.",
      ...transferInstructions,
      "Once we've received and verified the funds, we'll start processing your order. This usually takes one business day.",
      "This order is not paid yet. No action is needed if you have already transferred — we'll verify it and WooCommerce will email your Processing Order confirmation.",
    ],
    context,
    includeOrder: true,
    cta: orderCta(context),
    footerNote: ORDER_EMAIL_FOOTER,
  });

  return {
    ...rendered,
    subject: `Order #${context.orderNumber} — awaiting your payment`,
  };
}

/** Order shipped — includes the tracking number/link when available. */
export function orderShippedEmail(context: OrderEmailContext): RenderedEmail {
  const rendered = renderEmail({
    preheader: "Your Baby Secret order is on the way.",
    title: "Your order is on the way",
    body: [
      "Good news — your order has been handed over and is moving to you.",
      context.fulfillment.trackingNumber
        ? `Your tracking number is ${context.fulfillment.trackingNumber}.`
        : "Tracking details will follow in a separate email as soon as they're available.",
    ],
    context,
    includeOrder: true,
    cta:
      context.fulfillment.trackingUrl ??
      context.orderUrl
        ? {
            url: context.fulfillment.trackingUrl ?? context.orderUrl!,
            label: "Track your parcel",
          }
        : undefined,
    footerNote: ORDER_EMAIL_FOOTER,
  });

  return {
    ...rendered,
    subject: `Order #${context.orderNumber} has shipped`,
  };
}

export const customerOrderEmails = {
  order_received: orderReceivedEmail,
  payment_awaiting: paymentAwaitingEmail,
  order_shipped: orderShippedEmail,
} satisfies Record<string, (context: OrderEmailContext) => RenderedEmail>;