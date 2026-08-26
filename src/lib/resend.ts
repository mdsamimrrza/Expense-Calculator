import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY || "re_xxxxxxxxx";

export const resend = new Resend(apiKey);

export const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

/**
 * Sends a test email using Resend
 */
export async function sendTestEmail(to: string = "mdsamimrrza@gmail.com") {
  return await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to,
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });
}
