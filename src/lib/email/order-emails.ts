import "server-only";

import type { BankDetails } from "@/config/bank";
import {
  appendWooOrderMeta,
  metaValue,
  ORDER_EMAIL_LOG_META_KEY,
  type RawWooOrder,
} from "@/lib/woocommerce-orders";
import { sendMail, getSenderAddress, type EmailResult } from "@/lib/email/mailer";
import type { OrderEmailContext } from "@/lib/email/types";
import { customerOrderEmails } from "@/lib/email/customer-templates";
import { adminOrderEmails } from "@/lib/email/admin-templates";
import { buildOrderEmailContext } from "@/lib/email/order-context";

/**
 * Custom Next.js order-email dispatch.
 *
 * Design
 * ------
 * Canonical WooCommerce order-lifecycle mail—new-order, processing, completed,
 * cancelled, failed, and refund notifications handled by WordPress—remains with
 * FluentSMTP. Next.js must not duplicate those messages. This module sends only
 * custom application events: bank-transfer payment instructions, the admin
 * transfer-claim notice, and optional shipping-plugin "shipped" notices.
 *
 * Each send is recorded on the order, so re-processing the same custom event or
 * status never sends it twice.
 *
 * Sending never throws: the result is returned for logging, so a mail outage
 * cannot corrupt or block the underlying order operation.
 */

export type CustomerOrderEvent = keyof typeof customerOrderEmails;
export type AdminOrderEvent = keyof typeof adminOrderEmails;
export type OrderEmailEvent = CustomerOrderEvent | AdminOrderEvent;

type Audience = "customer" | "admin";

const AUDIENCE_BY_EVENT = new Map<string, Audience>([
  ...Object.keys(customerOrderEmails).map((event) => [event, "customer"]),
  ...Object.keys(adminOrderEmails).map((event) => [event, "admin"]),
] as [string, Audience][]);

/**
 * WooCommerce statuses that mean "the parcel is with the courier".
 *
 * WooCommerce core has no shipped status — it is added by shipping plugins — so
 * the list is configurable through `EMAIL_SHIPPED_STATUSES` and defaults to the
 * slugs those plugins commonly register.
 */
const DEFAULT_SHIPPED_STATUSES = [
  "shipped",
  "in-transit",
  "out-for-delivery",
  "dispatched",
];

function shippedStatuses(): string[] {
  const configured = process.env.EMAIL_SHIPPED_STATUSES;

  if (!configured) return DEFAULT_SHIPPED_STATUSES;

  return configured
    .split(",")
    .map((status) => status.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether an order status should produce a custom Next.js notification.
 *
 * Canonical statuses (`pending`, `on-hold`, `processing`, `completed`,
 * `cancelled`, `failed`, and `refunded`) are handled by WooCommerce +
 * FluentSMTP and intentionally return no event here. Only configured custom
 * shipping statuses produce `order_shipped`.
 */
function customStatusEvent(order: RawWooOrder): CustomerOrderEvent | null {
  const status = (order.status ?? "").toLowerCase();

  return shippedStatuses().includes(status) ? "order_shipped" : null;
}

/**
 * Recipients for admin notifications.
 *
 * `EMAIL_ADMIN_TO` may hold a comma-separated list. When it is blank it falls
 * back to the address in `EMAIL_FROM` — parsed, so a display-name sender such as
 * `Baby Secret <hello@babysecret.com>` yields a bare, valid address. Trim + drop
 * blanks: an empty `EMAIL_ADMIN_TO` must fall through rather than silently
 * swallowing admin notifications.
 */
export function getAdminRecipients(): string[] {
  const configured = process.env.EMAIL_ADMIN_TO?.trim() || getSenderAddress();

  return configured
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * Sent-email log stored on the order as a JSON array.
 */
function readSentLog(order: RawWooOrder): string[] {
  const raw = metaValue(order.meta_data, ORDER_EMAIL_LOG_META_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Dedupe key.
 *
 * Includes the WooCommerce status so a different custom shipped status can
 * still send, while re-processing the *same* status is a no-op.
 */
function dedupeKey(event: OrderEmailEvent, order: RawWooOrder): string {
  return `${event}:${AUDIENCE_BY_EVENT.get(event) ?? "customer"}:${order.status}`;
}

/**
 * Sends one order email, skipping it if this exact event+status was already sent
 * for this order.
 */
export async function sendOrderEmail(options: {
  order: RawWooOrder;
  event: OrderEmailEvent;
  /**
   * Forces a send even when the event+status combination was already recorded.
   * Used only for flows that cannot have been sent before (for example, the
   * awaiting-payment instructions for a brand-new bank-transfer order), never
   * to duplicate a canonical WooCommerce message.
   */
  force?: boolean;
  /**
   * Supplemental context for custom application events. This is how checkout
   * supplies the exact receiving account used for the transfer email.
   */
  contextOverrides?: Partial<OrderEmailContext>;
}): Promise<EmailResult> {
  const { order, event, force = false, contextOverrides } = options;

  const audience = AUDIENCE_BY_EVENT.get(event);

  if (!audience) {
    console.error(`[email] Unknown order email event: ${event}`);
    return { status: "failed", reason: "Unknown email event." };
  }

  const sentLog = readSentLog(order);
  const key = dedupeKey(event, order);

  if (!force && sentLog.includes(key)) {
    return { status: "skipped", reason: "already-sent" };
  }

  const context = {
    ...buildOrderEmailContext(order),
    ...contextOverrides,
  };

  const recipients =
    audience === "admin" ? getAdminRecipients() : [context.customerEmail];

  if (!recipients.filter(Boolean).length) {
    console.warn(
      `[email] No ${audience} recipient for order ${order.id}; skipping "${event}".`,
    );
    return { status: "skipped", reason: "no-recipient" };
  }

  const rendered =
    audience === "admin"
      ? adminOrderEmails[event as AdminOrderEvent](context)
      : customerOrderEmails[event as CustomerOrderEvent](context);

  const result = await sendMail({
    to: recipients,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  // Only record a successful send, so a transient failure can be retried.
  if (result.status === "sent") {
    await appendWooOrderMeta(order.id, [
      { key: ORDER_EMAIL_LOG_META_KEY, value: JSON.stringify([...new Set([...sentLog, key])]) },
    ]);
  }

  return result;
}

/**
 * Dispatches custom notifications implied by an order's current status.
 *
 * This is the entry point used by the WooCommerce order webhook. Canonical
 * statuses are intentionally ignored because WooCommerce + FluentSMTP sends
 * those lifecycle messages. Only configured custom shipping statuses produce a
 * Next.js `order_shipped` message.
 */
export async function dispatchOrderStatusEmails(
  order: RawWooOrder,
): Promise<void> {
  try {
    const event = customStatusEvent(order);

    if (event) {
      await sendOrderEmail({ order, event });
    }
  } catch (error) {
    // Dispatch must never break the webhook response or the order itself.
    console.error("[email] Order status dispatch failed:", error);
  }
}

/**
 * Sends the customer-facing order acknowledgment for a newly created order.
 *
 * This is not a duplicate of WooCommerce's admin New Order message. `force` is
 * safe here because a freshly created order cannot already carry a sent-email
 * log for this event.
 */
export async function sendOrderReceivedEmail(order: RawWooOrder): Promise<void> {
  try {
    await sendOrderEmail({ order, event: "order_received", force: true });
  } catch (error) {
    console.error("[email] Order-received email dispatch failed:", error);
  }
}

/**
 * Sends custom awaiting-payment instructions for a new bank-transfer order.
 *
 * WooCommerce sends its own admin New Order message; Next.js sends only the
 * customer-facing transfer instructions containing the exact receiving account
 * and payment reference. `force` is safe here because a freshly created order
 * cannot already carry a sent-email log for this event.
 */
export async function sendPaymentAwaitingEmail(
  order: RawWooOrder,
  bankAccount: BankDetails,
): Promise<void> {
  if ((order.payment_method ?? "") !== "bank_transfer") return;

  if (order.status !== "on-hold" && order.status !== "pending" && order.date_paid) {
    return;
  }

  try {
    await sendOrderEmail({
      order,
      event: "payment_awaiting",
      force: true,
      contextOverrides: { bankAccount },
    });
  } catch (error) {
    console.error("[email] Awaiting-payment email dispatch failed:", error);
  }
}

/**
 * Tells the admin a customer submitted a bank-transfer confirmation. The order
 * stays unpaid — verification happens in the WooCommerce admin.
 */
export async function sendBankTransferSubmittedEmail(
  order: RawWooOrder,
): Promise<EmailResult> {
  return sendOrderEmail({ order, event: "bank_transfer_submitted", force: true });
}