import { emailLayout } from "@/lib/email/resend";

interface AppointmentParams {
  callerName: string | null;
  callerPhone: string | null;
  appointmentDetails: string;
  callsUrl: string;
}

export function appointmentHtml({
  callerName,
  callerPhone,
  appointmentDetails,
  callsUrl,
}: AppointmentParams): string {
  const displayName = callerName ?? callerPhone ?? "A caller";
  const displayPhone = callerPhone ?? "Web call";

  const body = `
    <!-- Header -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
      <tr>
        <td width="52" valign="middle" style="padding-right:14px;">
          <div style="width:48px;height:48px;border-radius:10px;background:#f97316;text-align:center;line-height:48px;font-size:26px;">
            📅
          </div>
        </td>
        <td valign="middle">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:1px;">New appointment booked!</p>
          <h1 style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${escHtml(displayName)}</h1>
        </td>
      </tr>
    </table>

    <!-- Caller details card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;border-radius:8px;border:1px solid #222222;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;background:#0d0d0d;">
          <p style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;color:#666666;text-transform:uppercase;letter-spacing:0.8px;">Caller Details</p>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding-bottom:6px;">
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#888888;width:80px;display:inline-block;">Name</span>
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${escHtml(displayName)}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#888888;width:80px;display:inline-block;">Phone</span>
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;color:#ffffff;">${escHtml(displayPhone)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Appointment details card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border-radius:8px;border:1px solid #f97316;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;background:rgba(249,115,22,0.06);">
          <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.8px;">Appointment Details</p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#dddddd;line-height:1.6;">${escHtml(appointmentDetails)}</p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="border-radius:8px;background:#f97316;">
          <a href="${callsUrl}" target="_blank"
            style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            View call transcript →
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailLayout(
    `New appointment booked by ${displayName} — check your dashboard for details.`,
    body,
  );
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Detect if a transcript contains an appointment booking
export function detectsAppointment(transcript: string | null): boolean {
  if (!transcript) return false;
  const t = transcript.toLowerCase();
  return (
    (t.includes("appointment") ||
      t.includes("book") ||
      t.includes("schedul") ||
      t.includes("reservation") ||
      t.includes("slot")) &&
    // Must also mention a time or date to avoid false positives
    (t.includes("monday") ||
      t.includes("tuesday") ||
      t.includes("wednesday") ||
      t.includes("thursday") ||
      t.includes("friday") ||
      t.includes("saturday") ||
      t.includes("sunday") ||
      t.includes("tomorrow") ||
      t.includes("next week") ||
      t.includes("am") ||
      t.includes("pm") ||
      /\d{1,2}[:\-]\d{2}/.test(t) ||
      /\b\d{1,2}\/\d{1,2}/.test(t))
  );
}

// Extract the best appointment summary from a transcript
export function extractAppointmentDetails(transcript: string): string {
  const timeMatches: string[] = [];

  const patterns: RegExp[] = [
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:tomorrow|today|next\s+(?:week|monday|tuesday|wednesday|thursday|friday))\b/gi,
    /\b\d{1,2}:\d{2}\s*(?:am|pm)\b/gi,
    /\b\d{1,2}\s*(?:am|pm)\b/gi,
    /\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/gi,
  ];

  for (const re of patterns) {
    const matches = transcript.match(re);
    if (matches) {
      for (const m of matches) {
        const norm = m.trim();
        if (!timeMatches.some((x) => x.toLowerCase() === norm.toLowerCase())) {
          timeMatches.push(norm);
        }
      }
    }
  }

  if (timeMatches.length === 0) {
    return "Appointment booked — see full transcript for details.";
  }

  return `Booked for: ${timeMatches.slice(0, 4).join(", ")}`;
}
