import { renderEmail, ORDER_EMAIL_FOOTER } from "@/lib/email/layout";
import type { OrderEmailContext, RenderedEmail } from "@/lib/email/types";

/**
 * Admin-facing custom Next.js emails.
 *
 * WooCommerce + FluentSMTP owns canonical admin order-lifecycle mail, including
 * new-order and failure notifications. This module contains only the custom
 * bank-transfer claim notification that WooCommerce does not send.
 *
 * These go to the store inbox (`EMAIL_ADMIN_TO`, falling back to the sender)
 * and link straight to the order in the WooCommerce admin.
 */

function adminCta(context: OrderEmailContext) {
  return context.adminOrderUrl
    ? { url: context.adminOrderUrl, label: "Open order in WooCommerce" }
    : undefined;
}

/** Bank transfer confirmation submitted by the customer. */
export function bankTransferSubmittedEmail(
  context: OrderEmailContext,
): RenderedEmail {
  const payerName = context.bankTransfer?.payerName || "—";
  const transferReference =
    context.bankTransfer?.transferReference || "—";

  const rendered = renderEmail({
    preheader: `Bank transfer confirmation submitted for order #${context.orderNumber}.`,
    title: "Bank transfer confirmation submitted",
    body: [
      `${context.customerName} says they have transferred payment for order #${context.orderNumber}.`,
      `Payer name: ${payerName}\nTransfer reference: ${transferReference}`,
      "The order is still unpaid. Verify the funds arrived, then move the order to Processing. WooCommerce + FluentSMTP will send the customer's Processing Order email; Next.js does not send a second copy.",
    ],
    context,
    includeOrder: true,
    cta: adminCta(context),
    footerNote: ORDER_EMAIL_FOOTER,
  });

  return {
    ...rendered,
    subject: `[Verify payment] Order #${context.orderNumber} — ${payerName}`,
  };
}

export const adminOrderEmails = {
  bank_transfer_submitted: bankTransferSubmittedEmail,
} satisfies Record<string, (context: OrderEmailContext) => RenderedEmail>;