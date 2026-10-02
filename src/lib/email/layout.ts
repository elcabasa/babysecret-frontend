import type {
  FulfillmentSummary,
  OrderEmailContext,
  OrderEmailItem,
} from "@/lib/email/types";

/**
 * Branded Baby Secret email shell.
 *
 * Major mailbox providers strip most external CSS and rewrite layout, so the
 * markup here is table-based with inline styles only. The same data is
 * rendered as a plain text alternative for clients that disable HTML.
 */

const BRAND = {
  ink: "#0f172a",
  body: "#334f6d",
  primary: "#005dbd",
  soft: "#e7effc",
  border: "#e5e3e3",
  danger: "#b42318",
  success: "#067647",
} as const;

function money(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = currency || "NGN";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;line-height:1.6;color:${BRAND.body};font-size:15px;">${escapeHtml(
          block.trim(),
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:${BRAND.ink};font-weight:700;">${escapeHtml(
    text,
  )}</h1>`;
}

/**
 * Orders table — products, quantities and totals.
 */
function orderItemsTable(context: OrderEmailContext): {
  html: string;
  text: string;
} {
  const rows = context.items
    .map(
      (item: OrderEmailItem) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};">
          ${escapeHtml(item.name)}
          <span style="color:${BRAND.body};">&nbsp;&times;&nbsp;${item.quantity}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};white-space:nowrap;">
          ${money(item.total, context.currency)}
        </td>
      </tr>`,
    )
    .join("");

  const fulfillmentLabel =
    context.fulfillment.method === "pickup" ? "Pickup fee" : "Delivery";

  const totalsHtml = `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.body};">Subtotal</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};">${money(
        context.subtotal,
        context.currency,
      )}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.body};">${fulfillmentLabel}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};">${
        context.fulfillment.amount > 0
          ? money(context.fulfillment.amount, context.currency)
          : "Free"
      }</td>
    </tr>
    <tr>
      <td style="padding:12px 0;font-size:16px;font-weight:700;color:${BRAND.ink};">Total</td>
      <td align="right" style="padding:12px 0;font-size:16px;font-weight:700;color:${BRAND.ink};white-space:nowrap;">${money(
        context.total,
        context.currency,
      )}</td>
    </tr>`;

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
    <tbody>${rows}${totalsHtml}</tbody>
  </table>`;

  const text = [
    ...context.items.map(
      (item) => `${item.name} x${item.quantity} — ${money(item.total, context.currency)}`,
    ),
    "",
    `Subtotal: ${money(context.subtotal, context.currency)}`,
    `${fulfillmentLabel}: ${
      context.fulfillment.amount > 0
        ? money(context.fulfillment.amount, context.currency)
        : "Free"
    }`,
    `Total: ${money(context.total, context.currency)}`,
  ].join("\n");

  return { html, text };
}

/**
 * Fulfillment block — delivery address or pickup location, plus tracking when
 * it is available.
 */
function fulfillmentBlock(fulfillment: FulfillmentSummary): {
  html: string;
  text: string;
} {
  const isPickup = fulfillment.method === "pickup";
  const title = isPickup ? "Pickup location" : "Delivery address";

  const titleLine = isPickup
    ? fulfillment.locationName
      ? `<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${BRAND.ink};">${escapeHtml(
          fulfillment.locationName,
        )}</p>`
      : ""
    : "";

  const carrierLine =
    !isPickup && (fulfillment.carrier || fulfillment.service)
      ? `<p style="margin:0 0 4px;font-size:13px;color:${BRAND.body};">${escapeHtml(
          [fulfillment.carrier, fulfillment.service].filter(Boolean).join(" · "),
        )}</p>`
      : "";

  const trackingLine = fulfillment.trackingNumber
    ? `<p style="margin:8px 0 0;font-size:13px;color:${BRAND.body};">Tracking: <strong style="color:${BRAND.ink};">${escapeHtml(
        fulfillment.trackingNumber,
      )}</strong>${
        fulfillment.trackingUrl
          ? ` — <a href="${escapeHtml(fulfillment.trackingUrl)}" style="color:${BRAND.primary};">Track your parcel</a>`
          : ""
      }</p>`
    : "";

  const address = fulfillment.addressLines.filter(Boolean).join("<br />");

  const html = `<div style="margin:0 0 18px;padding:16px;background:${BRAND.soft};border-radius:10px;">
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${BRAND.primary};font-weight:700;">${title}</p>
    ${titleLine}
    <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.ink};">${address || "—"}</p>
    ${carrierLine}${trackingLine}
  </div>`;

  const text = [
    `${title}:`,
    ...(isPickup && fulfillment.locationName ? [fulfillment.locationName] : []),
    ...fulfillment.addressLines.filter(Boolean),
    ...(fulfillment.carrier || fulfillment.service
      ? [[fulfillment.carrier, fulfillment.service].filter(Boolean).join(" · ")].filter(
          Boolean,
        )
      : []),
    ...(fulfillment.trackingNumber
      ? [
          `Tracking: ${fulfillment.trackingNumber}${
            fulfillment.trackingUrl ? ` (${fulfillment.trackingUrl})` : ""
          }`,
        ]
      : []),
  ].join("\n");

  return { html, text };
}

/**
 * Payment status pill.
 */
function paymentBlock(context: OrderEmailContext): {
  html: string;
  text: string;
} {
  const labels: Record<OrderEmailContext["paymentState"], string> = {
    paid: "Paid",
    awaiting: "Awaiting payment",
    failed: "Payment failed",
    refunded: "Refunded",
  };

  const color =
    context.paymentState === "paid"
      ? BRAND.success
      : context.paymentState === "failed"
        ? BRAND.danger
        : BRAND.body;

  const html = `<p style="margin:0 0 16px;font-size:14px;color:${BRAND.body};">Payment status: <strong style="color:${color};">${labels[context.paymentState]}</strong>${
    context.paymentMethod ? ` &middot; ${escapeHtml(context.paymentMethod)}` : ""
  }</p>`;

  const text = `Payment status: ${labels[context.paymentState]}${
    context.paymentMethod ? ` (${context.paymentMethod})` : ""
  }`;

  return { html, text };
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;">
    <tr><td align="center" bgcolor="${BRAND.primary}" style="border-radius:999px;">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(
        label,
      )}</a>
    </td></tr>
  </table>`;
}

/**
 * Full email document.
 */
export function renderEmail(options: {
  preheader: string;
  title: string;
  body: string[];
  context?: OrderEmailContext;
  /** Show the full order summary (products, totals, fulfillment, payment). */
  includeOrder?: boolean;
  cta?: { url: string; label: string };
  footerNote?: string;
}): { html: string; text: string } {
  const { preheader, title, body, context, includeOrder, cta, footerNote } =
    options;

  const items = includeOrder && context ? orderItemsTable(context) : null;
  const fulfillment = includeOrder && context ? fulfillmentBlock(context.fulfillment) : null;
  const payment = includeOrder && context ? paymentBlock(context) : null;

  const bodyHtml = [
    heading(title),
    paragraphs(body.join("\n\n")),
    items?.html ?? "",
    fulfillment?.html ?? "",
    payment?.html ?? "",
    cta?.url ? button(cta.url, cta.label) : "",
  ].join("");

  const footerText = [
    "Baby Secret",
    footerNote ? `\n${footerNote}` : "",
    "\nNeed help? Reply to this email and we'll be happy to assist.",
  ].join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
      preheader,
    )}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:${BRAND.primary};">
                <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.02em;">Baby Secret</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${context ? `<p style="margin:0 0 20px;font-size:13px;color:${BRAND.body};">Hi ${escapeHtml(context.customerName)},<br />Order <strong style="color:${BRAND.ink};">#${escapeHtml(context.orderNumber)}</strong></p>` : ""}
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#fafbfc;border-top:1px solid ${BRAND.border};">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.body};">
                  ${escapeHtml(footerText)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hi ${context?.customerName ?? "there"},`,
    "",
    title,
    "",
    ...body.map((block) => `${block}\n`),
    items?.text ?? "",
    fulfillment?.text ?? "",
    payment?.text ?? "",
    cta?.url ? `${cta.label}: ${cta.url}` : "",
    footerText,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}

/**
 * Common footer note for order emails.
 */
export const ORDER_EMAIL_FOOTER =
  "Order details are also available in your Baby Secret account.";