import { createTransport } from "nodemailer";
import { formatCurrencyWhole } from "@/lib/format";

function getMailTransport() {
  return createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

export interface InstallmentEmailProps {
  to: string;
  userName?: string;
  fundName: string;
  monthlySip: number;
  dueDate: string;
  daysRemaining: number;
  appUrl?: string;
}

export async function sendInstallmentReminderEmail(props: InstallmentEmailProps): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getMailTransport();
    const appUrl = props.appUrl || process.env.NEXTAUTH_URL || "https://expense-calculator-taupe.vercel.app";
    const historyUrl = `${appUrl}/history`;

    const formattedAmount = formatCurrencyWhole(props.monthlySip);
    const timingText =
      props.daysRemaining === 0
        ? "is due today!"
        : props.daysRemaining === 1
        ? "is due tomorrow!"
        : `is due in ${props.daysRemaining} days!`;

    const subject =
      props.daysRemaining === 0
        ? `🔔 Today is your SIP Installment Date: ${props.fundName}`
        : `📅 Reminder: Monthly SIP Installment Due in ${props.daysRemaining} Days (${props.fundName})`;

    await transport.sendMail({
      to: props.to,
      from: process.env.EMAIL_FROM || "no-reply@sahakarisip.com",
      subject,
      text: `Hello ${props.userName || "Investor"},\n\nYour monthly SIP installment for ${props.fundName} (${formattedAmount}) ${timingText}\n\nDue Date: ${props.dueDate}\n\nLog your deposit entry here: ${historyUrl}\n\nHappy Investing,\nSahakariSIP Team`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Monthly SIP Reminder</title>
          </head>
          <body style="background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 16px; color: #f8fafc;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #111827; border-radius: 24px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-bottom: 1px solid #1e293b;">
                  <div style="font-size: 24px; font-weight: 900; color: #10b981; letter-spacing: -0.5px;">
                    📊 Sahakari<span style="color: #f59e0b;">SIP</span>
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Monthly Installment Reminder
                  </div>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px 32px;">
                  <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">
                    ${props.daysRemaining === 0 ? "🚀 Today is Installment Day!" : "⏰ Upcoming SIP Installment"}
                  </h1>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
                    Hello <strong style="color: #f1f5f9;">${props.userName || "Investor"}</strong>, this is a friendly reminder that your planned monthly SIP installment <strong style="color: #10b981;">${timingText}</strong>
                  </p>

                  <!-- Card with Details -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; margin-bottom: 28px; padding: 20px;">
                    <tr>
                      <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #1e293b;">Mutual Fund</td>
                      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #f8fafc; text-align: right; border-bottom: 1px solid #1e293b;">${props.fundName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #1e293b;">Planned Amount</td>
                      <td style="padding: 8px 12px; font-size: 15px; font-weight: 800; color: #10b981; text-align: right; border-bottom: 1px solid #1e293b;">${formattedAmount}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Due Date</td>
                      <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #f59e0b; text-align: right;">${props.dueDate}</td>
                    </tr>
                  </table>

                  <!-- Call to Action Button -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${historyUrl}" style="display: inline-block; background-color: #10b981; color: #022c22; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                          Record Deposit Entry →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size: 12px; color: #64748b; text-align: center; margin: 24px 0 0 0;">
                    Keep your savings streak alive! Making consistent monthly deposits accelerates compound growth.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #0a0f1d; padding: 20px 32px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e293b;">
                  SahakariSIP • Systematic Investment Plan Tracker<br>
                  You can manage your notification preferences in <a href="${appUrl}/settings" style="color: #10b981; text-decoration: none;">Account Settings</a>.
                </td>
              </tr>

            </table>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[sendInstallmentReminderEmail] error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}
