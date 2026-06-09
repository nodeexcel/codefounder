import { emailLayout } from "@/lib/email/resend";

interface WelcomeParams {
  name: string;
  dashboardUrl: string;
}

export function welcomeHtml({ name, dashboardUrl }: WelcomeParams): string {
  const firstName = name.split(" ")[0] || name;
  const body = `
    <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Welcome to CodeFounder! 🎉
    </h1>
    <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#999999;line-height:1.6;">
      Hi ${firstName}, your account is ready. Here's how to get your AI agent live in minutes.
    </p>

    <!-- Steps -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
      ${step("1", "#f97316", "Set up your Voice Agent", "Open the Setup Wizard and fill in your business details. It takes about 3 minutes.")}
      ${step("2", "#f97316", "Configure your AI Agent", "Choose a name, tone, and set your business hours. Your agent will handle calls automatically.")}
      ${step("3", "#f97316", "Go live &amp; monitor calls", "Your AI agent will answer calls 24/7. View transcripts and call logs from your dashboard.")}
    </table>

    <!-- CTA button -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-radius:8px;background:#f97316;">
          <a href="${dashboardUrl}" target="_blank"
            style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Go to Dashboard →
          </a>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #222222;margin:0 0 24px;" />

    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#666666;line-height:1.7;">
      Need help? Reply to this email or visit the
      <a href="${dashboardUrl}" style="color:#f97316;text-decoration:none;">dashboard</a>
      to get started. We're excited to have you on board.
    </p>
  `;

  return emailLayout(
    `Hi ${firstName}, your CodeFounder account is ready. Set up your AI agent in minutes.`,
    body,
  );
}

function step(num: string, color: string, title: string, desc: string): string {
  return `
    <tr>
      <td style="padding:0 0 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td width="36" valign="top" style="padding-right:14px;">
              <div style="width:32px;height:32px;border-radius:50%;background:${color};text-align:center;line-height:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:700;color:#ffffff;">
                ${num}
              </div>
            </td>
            <td valign="top">
              <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#ffffff;">${title}</p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#888888;line-height:1.5;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}
