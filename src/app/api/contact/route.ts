import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { name, email, company, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: "info@codefounder.ai",
    replyTo: email,
    subject: "New Contact Form Submission - CodeFounder",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f0f0f;color:#e5e7eb;border-radius:12px">
        <h2 style="color:#FF7A1A;margin-top:0">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af;width:120px">Name</td><td style="padding:10px 0;border-bottom:1px solid #222">${name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af">Email</td><td style="padding:10px 0;border-bottom:1px solid #222"><a href="mailto:${email}" style="color:#FF7A1A">${email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#9ca3af">Company</td><td style="padding:10px 0;border-bottom:1px solid #222">${company || "—"}</td></tr>
        </table>
        <div style="margin-top:24px">
          <p style="color:#9ca3af;margin-bottom:8px">Message</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:16px;white-space:pre-wrap">${message}</div>
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
