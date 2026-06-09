import { Resend } from "resend";

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", to);
    return { success: false, error: "Email not configured" };
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] send failed:", error);
      return { success: false, error: error.message };
    }
    console.log("[email] sent:", subject, "→", to);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] error:", msg);
    return { success: false, error: msg };
  }
}

// Shared wrapper so every email has consistent branding
export function emailLayout(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>CodeFounder</title>
<!--[if mso]><style>td,th{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#000000;-webkit-text-size-adjust:100%;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:40px 16px;background:#000000;">

  <!-- Card -->
  <table role="presentation" width="100%" style="max-width:580px;" cellspacing="0" cellpadding="0">

    <!-- Logo bar -->
    <tr>
      <td style="background:#0a0a0a;padding:20px 32px;border-radius:12px 12px 0 0;border:1px solid #222222;border-bottom:none;">
        <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f97316;letter-spacing:-0.3px;">
          CodeFounder
        </span>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:#111111;padding:32px;border-left:1px solid #222222;border-right:1px solid #222222;">
        ${body}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#0a0a0a;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #222222;border-top:1px solid #1a1a1a;text-align:center;">
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#555555;">
          © 2026 CodeFounder · AI Agent Platform<br/>
          <a href="https://codefounder.ai/unsubscribe" style="color:#777777;text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp;
          <a href="https://codefounder.ai/privacy" style="color:#777777;text-decoration:underline;">Privacy</a>
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}
