import "server-only";

import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Server-side transactional email transport: Titan SMTP.
 *
 * This transport sends custom Next.js application mail. WooCommerce's
 * canonical order emails remain with FluentSMTP in WordPress and must not be
 * duplicated here.
 *
 * SECURITY
 * --------
 * This module is marked `server-only`, so importing it from a React Server /
 * Client Component or any browser bundle fails the build. Credentials are read
 * from non-public environment variables (`EMAIL_USER`, `EMAIL_PASSWORD`, …) which
 * are never prefixed with `NEXT_PUBLIC_`, so they cannot reach the browser.
 * Google OAuth credentials are never used for SMTP.
 *
 * There is deliberately **no fallback transport**: no Brevo HTTP API and no
 * legacy `SMTP_*` aliasing. A missing/blank credential is a deployment error, so
 * it is reported loudly server-side and the send is skipped — it never silently
 * switches to a different provider. Errors are returned as a result object
 * rather than thrown, so a mail outage can never fail an order, and internal
 * provider details are never surfaced to a customer.
 */

export type EmailSkipReason =
  | "not-configured"
  | "already-sent"
  | "no-recipient";

export type EmailResult =
  | { status: "sent"; messageId?: string }
  | { status: "skipped"; reason: EmailSkipReason }
  | { status: "failed"; reason: string };

export interface SendMailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Overrides the default `EMAIL_FROM` sender. */
  replyTo?: string;
}

interface Sender {
  name: string;
  address: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  sender: Sender;
  secure: boolean;
  /** Names of the missing env vars — never their values. */
  missing: string[];
}

/**
 * Reads an env var, treating a blank value as absent.
 *
 * `.env` files ship placeholders like `EMAIL_PASSWORD=`, and `??` does not fall
 * back on an empty string — so blank must be normalised to `undefined` or a
 * blank placeholder would look "configured" while silently failing every send.
 */
function readEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

/**
 * Parses `EMAIL_FROM`.
 *
 * Supports both a bare address (`hello@babysecret.com`) and the RFC 5322 display
 * form (`Baby Secret <hello@babysecret.com>`). Nodemailer wants the two parts
 * separately, so passing the raw header through as the address would produce an
 * invalid `From:` line.
 */
export function parseFromHeader(value: string): Sender {
  const raw = value.trim();
  const match = /^"?([^"<]*)"?\s*<\s*([^<>\s]+)\s*>$/.exec(raw);

  if (match) {
    return {
      name: match[1].trim() || "Baby Secret",
      address: match[2].trim(),
    };
  }

  return { name: "Baby Secret", address: raw };
}

/**
 * The bare sender address, for use as a default admin recipient.
 */
export function getSenderAddress(): string {
  return parseFromHeader(readEnv("EMAIL_FROM")).address;
}

/**
 * Reads Titan SMTP settings from the environment.
 */
function getSmtpConfig(): SmtpConfig {
  const host = readEnv("EMAIL_HOST");
  const port = Number(readEnv("EMAIL_PORT") || "465");
  const user = readEnv("EMAIL_USER");
  const password = readEnv("EMAIL_PASSWORD");
  const sender = parseFromHeader(readEnv("EMAIL_FROM"));

  // Port 465 is implicit TLS; 587 is STARTTLS. An explicit EMAIL_SECURE wins.
  const secureOverride = readEnv("EMAIL_SECURE").toLowerCase();
  const secure = secureOverride
    ? secureOverride === "true"
    : (Number.isFinite(port) && port > 0 ? port : 465) === 465;

  const missing: string[] = [];

  if (!host) missing.push("EMAIL_HOST");
  if (!user) missing.push("EMAIL_USER");
  if (!password) missing.push("EMAIL_PASSWORD");
  if (!sender.address) missing.push("EMAIL_FROM");

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    user,
    password,
    sender,
    secure,
    missing,
  };
}

/**
 * Whether transactional email can be sent at all.
 */
export function isEmailConfigured(): boolean {
  return getSmtpConfig().missing.length === 0;
}

let transporter: Transporter | null = null;
let transporterKey = "";

/**
 * Lazily builds (and reuses) the SMTP transport. Rebuilt when credentials
 * change so a redeploy with new secrets does not keep a stale connection.
 */
function getTransporter(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}:${config.secure}`;

  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Require a current TLS chain when the provider uses implicit TLS.
    requireTLS: config.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  transporterKey = key;

  return transporter;
}

/**
 * Sends a single transactional email.
 *
 * Never throws: callers get a result they can log or surface, which keeps an
 * email outage from failing the surrounding business operation.
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendMailArgs): Promise<EmailResult> {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (!recipients.length) {
    return { status: "failed", reason: "No recipient provided." };
  }

  const config = getSmtpConfig();

  if (config.missing.length) {
    /*
     * Names only — never values. There is no fallback transport by design, so
     * the operator must fix the environment rather than have mail silently go
     * somewhere else.
     */
    console.error(
      `[email] Titan SMTP is not configured. Missing environment variable(s): ${config.missing.join(", ")}. Skipping send of "${subject}".`,
    );

    return { status: "skipped", reason: "not-configured" };
  }

  try {
    const info = await getTransporter(config).sendMail({
      from: config.sender,
      to: recipients.join(", "),
      ...(replyTo ? { replyTo } : {}),
      subject,
      html,
      text,
    });

    return { status: "sent", messageId: info.messageId };
  } catch (error) {
    /*
     * Log the failure server-side for operators. The reason returned to the
     * caller is deliberately generic — SMTP credentials and transport internals
     * must never reach a customer-facing response.
     */
    const reason = error instanceof Error ? error.message : "Unknown SMTP failure";

    /*
     * Recipients are customer PII: log a hash + count for operations, never
     * the addresses themselves.
     */
    const recipientHash = createHash("sha256")
      .update(recipients.join(",").toLowerCase())
      .digest("hex")
      .slice(0, 16);

    console.error("[email] Failed to send:", {
      subject,
      recipientCount: recipients.length,
      recipientHash,
      reason,
    });

    return { status: "failed", reason: "Email could not be sent." };
  }
}

/**
 * Clears the cached transport (used by tests).
 */
export function resetTransporter(): void {
  transporter = null;
  transporterKey = "";
}