import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { getProductById } from "@/services/product.service";
import { sendMail } from "@/lib/email/mailer";
import { deliveryAssistanceEmail } from "@/lib/email/delivery-assistance";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";

/**
 * Customer-facing delivery-assistance requests.
 *
 * This endpoint exists for the one case automatic checkout cannot handle: the
 * customer wants delivery, but Terminal Africa returned no quote for their
 * address. It records the request and notifies the store — it never creates a
 * shipping quote, charges a fee, creates an order, or changes order state.
 *
 * Deduplication is best-effort and two-layered:
 * 1. The browser keeps one idempotency key per assistance attempt and reuses
 *    it across retries/refreshes.
 * 2. The server derives a deterministic reference from the normalized payload
 *    and keeps recently processed request keys in memory, so a retried
 *    submission returns the same reference without sending another email.
 * Serverless instances do not share memory, so the deterministic reference at
 * least lets the admin recognize repeats as the same request.
 */

const ASSISTANCE_RECIPIENT = "hello@babysecret.com";
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEDUPE_ENTRIES = 500;

const assistanceItemSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  variantId: z.union([z.string(), z.number()]).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().int().min(1).max(99),
});

const assistanceSchema = z.object({
  requestId: z
    .string()
    .uuid("Invalid assistance request. Please reload and try again."),
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  state: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  apartment: z.string().trim().max(200).optional().default(""),
  country: z.string().trim().min(2).max(56).optional().default("Nigeria"),
  note: z.string().trim().max(500).optional().default(""),
  items: z.array(assistanceItemSchema).min(1).max(20),
});

type AssistanceRequest = z.infer<typeof assistanceSchema>;

const processedRequests = new Map<string, { reference: string; expiresAt: number }>();

function pruneProcessedRequests(now: number): void {
  for (const [key, entry] of processedRequests) {
    if (entry.expiresAt <= now) processedRequests.delete(key);
  }

  while (processedRequests.size > MAX_DEDUPE_ENTRIES) {
    const oldest = processedRequests.keys().next();

    if (oldest.done) break;

    processedRequests.delete(oldest.value);
  }
}

function canonicalPayload(request: AssistanceRequest): string {
  const items = [...request.items]
    .map((item) => ({
      productId: item.productId,
      variantId:
        item.variantId !== undefined ? String(item.variantId) : "",
      name: item.name ?? "",
      quantity: item.quantity,
    }))
    .sort((a, b) =>
      `${a.productId}|${a.variantId}|${a.name}|${a.quantity}`.localeCompare(
        `${b.productId}|${b.variantId}|${b.name}|${b.quantity}`,
      ),
    );

  return JSON.stringify({
    requestId: request.requestId,
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email.toLowerCase(),
    phone: request.phone.replace(/\s+/g, ""),
    state: request.state,
    city: request.city,
    address: request.address,
    apartment: request.apartment,
    country: request.country,
    note: request.note,
    items,
  });
}

function referenceFor(canonical: string): string {
  return `DLV-${createHash("sha256").update(canonical).digest("hex").slice(0, 5).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid assistance request." },
      { status: 400 },
    );
  }

  const parsed = assistanceSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return NextResponse.json(
      { message: firstIssue?.message ?? "Invalid assistance request." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const canonical = canonicalPayload(data);
  const reference = referenceFor(canonical);
  const dedupeKey = `${data.requestId}:${reference}`;
  const now = Date.now();

  // Inbox-bomb backstop (per sender + IP). Recipient stays the store inbox.
  const limit = checkRateLimit(
    requestKey(request, `assistance:${data.email.toLowerCase().trim()}`),
    5,
    60 * 60 * 1000,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  pruneProcessedRequests(now);

  const alreadyProcessed = processedRequests.get(dedupeKey);

  if (alreadyProcessed && alreadyProcessed.expiresAt > now) {
    return NextResponse.json({
      success: true,
      reference: alreadyProcessed.reference,
      duplicate: true,
    });
  }

  // Resolve display names and catalog prices server-side. Client prices are
  // never accepted: the schema has no price field, and unknown products are
  // shown without a price rather than blocking the request.
  const emailItems: {
    productId: string;
    variantId?: string;
    name: string;
    quantity: number;
    unitPrice?: number;
  }[] = [];
  let subtotal = 0;
  let pricedItems = 0;

  for (const item of data.items) {
    let product: { name: string; price: number } | null = null;

    try {
      product = await getProductById(item.productId);
    } catch {
      product = null;
    }

    const name = product?.name ?? item.name ?? `Product ${item.productId}`;
    const unitPrice =
      product && Number.isFinite(product.price) ? product.price : undefined;

    if (unitPrice !== undefined) {
      subtotal += unitPrice * item.quantity;
      pricedItems += 1;
    }

    emailItems.push({
      productId: item.productId,
      ...(item.variantId !== undefined
        ? { variantId: String(item.variantId) }
        : {}),
      name,
      quantity: item.quantity,
      ...(unitPrice !== undefined ? { unitPrice } : {}),
    });
  }

  const submittedAt = new Date(now);
  const submittedAtLabel = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(submittedAt);

  const rendered = deliveryAssistanceEmail({
    reference,
    requestId: data.requestId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    state: data.state,
    city: data.city,
    address: data.address,
    apartment: data.apartment || undefined,
    country: data.country,
    note: data.note || undefined,
    items: emailItems,
    ...(pricedItems > 0 ? { subtotal } : {}),
    submittedAtLabel: `${submittedAtLabel} (Africa/Lagos)`,
  });

  const result = await sendMail({
    to: ASSISTANCE_RECIPIENT,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (result.status !== "sent") {
    // The request itself is valid, but the admin was not notified — so this
    // must not be reported as submitted. The message stays generic: SMTP
    // internals never reach the customer.
    console.error("[shipping] Delivery assistance email was not sent:", {
      reference,
      items: data.items.length,
      status: result.status,
    });

    return NextResponse.json(
      {
        message:
          "Delivery assistance is currently unavailable. Please try again or contact support.",
      },
      { status: 503 },
    );
  }

  processedRequests.set(dedupeKey, {
    reference,
    expiresAt: now + DEDUPE_TTL_MS,
  });

  console.info("[shipping] Delivery assistance request submitted:", {
    reference,
    items: data.items.length,
  });

  return NextResponse.json({ success: true, reference, duplicate: false });
}
