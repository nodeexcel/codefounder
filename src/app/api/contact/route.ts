import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_COMPANY = 200;
const MAX_MESSAGE = 5000;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, company, message } = body as {
    name?: unknown;
    email?: unknown;
    company?: unknown;
    message?: unknown;
  };

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof message !== "string" || !message.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (name.length > MAX_NAME || email.length > MAX_EMAIL || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "One or more fields exceed maximum length." }, { status: 400 });
  }

  const companyStr = typeof company === "string" ? company.slice(0, MAX_COMPANY) : "";

  const safeName    = escapeHtml(name.trim());
  const safeEmail   = escapeHtml(email.trim());
  const safeCompany = escapeHtml(companyStr.trim());
  const safeMessage = escapeHtml(message.trim());

  const recipient =
    process.env.CONTACT_RECIPIENT_EMAIL ?? "info@codefounder.ai";

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: recipient,
    replyTo: safeEmail,
    subject: "New Contact Form Submission - CodeFounder",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f0f0f;color:#e5e7eb;border-radius:12px">
        <h2 style="color:#FF7A1A;margin-top:0">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af;width:120px">Name</td><td style="padding:10px 0;border-bottom:1px solid #222">${safeName}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af">Email</td><td style="padding:10px 0;border-bottom:1px solid #222"><a href="mailto:${safeEmail}" style="color:#FF7A1A">${safeEmail}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af">Company</td><td style="padding:10px 0;border-bottom:1px solid #222">${safeCompany || "—"}</td></tr>
        </table>
        <div style="margin-top:24px">
          <p style="color:#9ca3af;margin-bottom:8px">Message</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:16px;white-space:pre-wrap">${safeMessage}</div>
        </div>
        <p style="margin-top:32px;font-size:12px;color:#4b5563">Sent from codefounder.ai contact form</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
