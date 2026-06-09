import { emailLayout } from "@/lib/email/resend";

interface NewCallParams {
  callerName: string | null;
  callerPhone: string | null;
  durationSeconds: number | null;
  transcriptPreview: string | null;
  callsUrl: string;
}

export function newCallHtml({
  callerName,
  callerPhone,
  durationSeconds,
  transcriptPreview,
  callsUrl,
}: NewCallParams): string {
  const displayName = callerName ?? callerPhone ?? "Unknown caller";
  const isWebCall = !callerPhone;
  const duration = formatDuration(durationSeconds);
  const preview = transcriptPreview
    ? transcriptPreview.slice(0, 220).trimEnd() + (transcriptPreview.length > 220 ? "…" : "")
    : null;

  const body = `
    <!-- Icon + title -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td width="48" valign="middle" style="padding-right:14px;">
          <div style="width:44px;height:44px;border-radius:10px;background:#f97316;text-align:center;line-height:44px;font-size:22px;">
            📞
          </div>
        </td>
        <td valign="middle">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:1px;">New call received</p>
          <h1 style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${escHtml(displayName)}</h1>
        </td>
      </tr>
    </table>

    <!-- Stats row -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border-radius:8px;overflow:hidden;border:1px solid #222222;">
      <tr>
        ${statCell("Duration", duration)}
        ${statCell("Source", isWebCall ? "Web call" : "Phone")}
        ${callerPhone ? statCell("Number", escHtml(callerPhone)) : ""}
      </tr>
    </table>

    ${preview ? `
    <!-- Transcript preview -->
    <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;color:#666666;text-transform:uppercase;letter-spacing:1px;">Transcript preview</p>
    <div style="padding:16px;background:#0a0a0a;border-radius:8px;border:1px solid #1e1e1e;margin-bottom:24px;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#aaaaaa;line-height:1.7;font-style:italic;">
        "${escHtml(preview)}"
      </p>
    </div>
    ` : ""}

    <!-- CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="border-radius:8px;background:#f97316;">
          <a href="${callsUrl}" target="_blank"
            style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            View full transcript →
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailLayout(
    `New call from ${displayName} · ${duration}`,
    body,
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function statCell(label: string, value: string): string {
  return `
    <td style="padding:14px 16px;background:#0d0d0d;border-right:1px solid #222222;width:33%;">
      <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#666666;text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#ffffff;">${value}</p>
    </td>
  `;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
