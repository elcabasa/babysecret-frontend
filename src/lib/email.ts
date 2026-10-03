/**
 * Authentication email facade.
 *
 * Order transactional emails live in `src/lib/email/*` — this module keeps the
 * existing account-email API (`sendOtpEmail`, `sendResetEmail`) used by the
 * register / verify / forgot-password routes, now backed by the same server-side
 * SMTP service so the store has a single email transport.
 *
 * This is separate from Google OAuth: NextAuth handles sign-in and never sends
 * email itself.
 */
import "server-only";

import { sendMail } from "@/lib/email/mailer";
import { renderEmail } from "@/lib/email/layout";

/**
 * Sends an email through the server-side SMTP service.
 *
 * Kept for backwards compatibility with existing callers; returns the send
 * result so callers can log failures without surfacing SMTP internals.
 */
export function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  return sendMail({
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text ?? "",
  });
}

export function sendOtpEmail(to: string, code: string) {
  const { html, text } = renderEmail({
    preheader: `Your Baby Secret verification code is ${code}.`,
    title: "Verify your Baby Secret account",
    body: [
      "Welcome to Baby Secret.",
      `Your verification code is ${code}. It expires in 10 minutes.`,
      "If you didn't create an account, you can ignore this email.",
    ],
  });

  return sendMail({
    to,
    subject: "Verify your Baby Secret account",
    html,
    text,
  });
}

export function sendResetEmail(to: string, resetUrl: string) {
  const { html, text } = renderEmail({
    preheader: "Reset your Baby Secret password.",
    title: "Reset your password",
    body: [
      "We received a request to reset your Baby Secret password.",
      "Use the button below to choose a new password. If you didn't request this, you can ignore this email.",
    ],
    cta: { url: resetUrl, label: "Choose a new password" },
  });

  return sendMail({
    to,
    subject: "Reset your Baby Secret password",
    html,
    text,
  });
}