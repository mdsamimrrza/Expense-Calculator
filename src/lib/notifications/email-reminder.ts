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
    const settingsUrl = `${appUrl}/settings`;

    const formattedAmount = formatCurrencyWhole(props.monthlySip);
    const isDueToday = props.daysRemaining === 0;
    const isDueTomorrow = props.daysRemaining === 1;

    const badgeColor = isDueToday ? "#ef4444" : isDueTomorrow ? "#f59e0b" : "#10b981";
    const badgeText = isDueToday ? "Due Today" : isDueTomorrow ? "Due Tomorrow" : `Due in ${props.daysRemaining} Days`;

    const subject = isDueToday
      ? `🚨 Action Required: Your SIP Installment for ${props.fundName} is Due Today!`
      : `📅 Upcoming SIP Reminder: ${formattedAmount} due in ${props.daysRemaining} days (${props.fundName})`;

    await transport.sendMail({
      to: props.to,
      from: process.env.EMAIL_FROM || "no-reply@sahakarisip.com",
      subject,
      text: `Hello ${props.userName || "Investor"},\n\nYour planned monthly SIP installment for ${props.fundName} (${formattedAmount}) is ${badgeText}.\n\nDue Date: ${props.dueDate}\n\nRecord your deposit entry: ${historyUrl}\n\nHappy Investing,\nSahakariSIP Team`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SahakariSIP Installment Reminder</title>
          </head>
          <body style="background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 32px 16px; color: #f9fafb; -webkit-font-smoothing: antialiased;">
            
            <!-- Main Card Container -->
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #0f172a; border-radius: 28px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
              
              <!-- Top Glow Bar -->
              <tr>
                <td height="4" style="background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #f59e0b 100%);"></td>
              </tr>

              <!-- Header with Logo -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #0f172a 0%, #0a0f1d 100%);">
                  <div style="display: inline-block; font-size: 26px; font-weight: 900; color: #10b981; letter-spacing: -0.5px; text-decoration: none;">
                    📊 Sahakari<span style="color: #f59e0b;">SIP</span>
                  </div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                    Smart Mutual Fund Ledger
                  </div>
                </td>
              </tr>

              <!-- Hero / Main Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  
                  <!-- Badge Pill -->
                  <div style="text-align: center; margin-bottom: 20px;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); color: ${badgeColor}; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 9999px; padding: 6px 16px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">
                      ● ${badgeText}
                    </span>
                  </div>

                  <!-- Greeting & Title -->
                  <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; text-align: center; margin: 0 0 10px 0; letter-spacing: -0.5px;">
                    ${isDueToday ? "Deposit Due Today" : "Monthly Installment Due"}
                  </h1>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: center; margin: 0 0 28px 0;">
                    Hello <strong style="color: #f8fafc;">${props.userName || "Investor"}</strong>, keep your compounding momentum going by recording this month's SIP deposit.
                  </p>

                  <!-- Amount Hero Box -->
                  <div style="background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 20px; padding: 24px; text-align: center; margin-bottom: 28px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);">
                    <div style="font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Planned Monthly SIP
                    </div>
                    <div style="font-size: 34px; font-weight: 900; color: #10b981; letter-spacing: -1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${formattedAmount}
                    </div>
                    <div style="font-size: 13px; color: #cbd5e1; font-weight: 600; margin-top: 6px;">
                      ${props.fundName}
                    </div>
                  </div>

                  <!-- Details Specs Table -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0b1120; border-radius: 16px; border: 1px solid #1e293b; margin-bottom: 32px; overflow: hidden;">
                    <tr>
                      <td style="padding: 14px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #1e293b;">Mutual Fund Scheme</td>
                      <td style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #f8fafc; text-align: right; border-bottom: 1px solid #1e293b;">${props.fundName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 18px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #1e293b;">Scheduled Due Date</td>
                      <td style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #f59e0b; text-align: right; border-bottom: 1px solid #1e293b;">${props.dueDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 18px; font-size: 13px; color: #94a3b8;">Status</td>
                      <td style="padding: 14px 18px; font-size: 13px; font-weight: 800; color: ${badgeColor}; text-align: right;">${badgeText}</td>
                    </tr>
                  </table>

                  <!-- Primary CTA Button -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${historyUrl}" style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 800; font-size: 15px; text-decoration: none; padding: 16px 32px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4); letter-spacing: 0.2px;">
                          Record Deposit Entry Now →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Tip Callout -->
                  <div style="background-color: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 14px; padding: 14px 18px; margin-top: 28px; text-align: center;">
                    <span style="font-size: 12px; color: #f59e0b; font-weight: 600; line-height: 1.5;">
                      💡 Consistent monthly investing maximizes rupee-cost averaging and long-term compound growth.
                    </span>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #080d1a; padding: 24px 32px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e293b; line-height: 1.6;">
                  <div style="color: #64748b; font-weight: 600; margin-bottom: 6px;">
                    SahakariSIP • Systematic Investment Plan Ledger
                  </div>
                  You received this automated reminder because email notifications are enabled.<br>
                  <a href="${settingsUrl}" style="color: #10b981; text-decoration: none; font-weight: 700;">Manage notification preferences</a>
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
