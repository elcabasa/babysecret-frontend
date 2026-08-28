const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function sender() {
  return {
    name: "Baby Secret",
    email: process.env.SMTP_FROM ?? "info@babysecret.com",
  };
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn("BREVO_API_KEY is not set; skipping email send.");
    return;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: to }],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Brevo email failed:", response.status, detail);
    }
  } catch (error) {
    console.error("Brevo email error:", error);
  }
}

export function sendOtpEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: "Verify your Baby Secret account",
    html: `<p>Hi there,</p><p>Your Baby Secret verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
    text: `Your Baby Secret verification code is ${code}. It expires in 10 minutes.`,
  });
}

export function sendResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your Baby Secret password",
    html: `<p>Hi there,</p><p>We received a request to reset your password. Click the link below to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    text: `Reset your password: ${resetUrl}`,
  });
}
