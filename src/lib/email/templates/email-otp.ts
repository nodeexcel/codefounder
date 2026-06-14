import { emailLayout } from "@/lib/email/resend";

interface EmailOtpParams {
  name: string;
  otp: string;
  expiryMinutes: number;
}

export function emailOtpHtml({ name, otp, expiryMinutes }: EmailOtpParams): string {
  const firstName = name.split(" ")[0] || name;

  const digitCells = otp
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px;">
          <div style="width:44px;height:52px;background:#1a1a1a;border:1.5px solid #f97316;border-radius:8px;text-align:center;line-height:52px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;font-size:26px;font-weight:700;color:#f97316;">
            ${d}
          </div>
        </td>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
      Verify your email
    </h1>
    <p style="margin:0 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#999999;line-height:1.6;">
      Hi ${firstName}, enter the code below to complete your CodeFounder registration.
    </p>

    <!-- OTP digits -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
      <tr>${digitCells}</tr>
    </table>

    <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#666666;text-align:center;line-height:1.6;">
      This code expires in <strong style="color:#ffffff;">${expiryMinutes} minutes</strong>.
      Do not share it with anyone.
    </p>

    <hr style="border:none;border-top:1px solid #222222;margin:0 0 24px;" />

    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#555555;line-height:1.7;">
      If you didn't request this code, you can safely ignore this email.
      Someone may have entered your email address by mistake.
    </p>
  `;

  return emailLayout(
    `Your CodeFounder verification code is ${otp}. Valid for ${expiryMinutes} minutes.`,
    body,
  );
}
