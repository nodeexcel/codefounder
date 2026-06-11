import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailLayout } from "@/lib/email/resend";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agentId, employeeName, employeeEmail, leaveType, startDate, endDate, reason } = body as {
    agentId?: string;
    employeeName?: string;
    employeeEmail?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!agentId || !employeeName || !employeeEmail || !leaveType || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: session } = await adminSupabase
    .from("agent_wizard_sessions")
    .select("id, user_id, voice_settings, business_details")
    .eq("id", agentId)
    .eq("agent_type", "hr")
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "HR agent not found" }, { status: 404 });

  const { error } = await adminSupabase.from("hr_leave_requests").insert({
    user_id: session.user_id,
    agent_id: session.id,
    employee_name: employeeName,
    employee_email: employeeEmail,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: reason ?? "",
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hrSettings = session.voice_settings as { approverEmail?: string } | null;
  const business = session.business_details as { businessName?: string } | null;
  const approverEmail = hrSettings?.approverEmail;
  const companyName = business?.businessName ?? "Your Company";

  if (approverEmail) {
    const html = emailLayout(
      `New leave request from ${employeeName}`,
      `<h2 style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;margin:0 0 8px;">New Leave Request</h2>
       <p style="color:#888888;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;margin:0 0 24px;">
         A leave request has been submitted through your ${companyName} HR Agent.
       </p>
       <table style="width:100%;border-collapse:collapse;margin:0 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
         <tr style="border-bottom:1px solid #222;">
           <td style="padding:10px 0;color:#888;font-size:13px;width:140px;">Employee</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${employeeName}</td>
         </tr>
         <tr style="border-bottom:1px solid #222;">
           <td style="padding:10px 0;color:#888;font-size:13px;">Email</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${employeeEmail}</td>
         </tr>
         <tr style="border-bottom:1px solid #222;">
           <td style="padding:10px 0;color:#888;font-size:13px;">Leave type</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${leaveType}</td>
         </tr>
         <tr style="border-bottom:1px solid #222;">
           <td style="padding:10px 0;color:#888;font-size:13px;">From</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${startDate}</td>
         </tr>
         <tr style="border-bottom:1px solid #222;">
           <td style="padding:10px 0;color:#888;font-size:13px;">To</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${endDate}</td>
         </tr>
         <tr>
           <td style="padding:10px 0;color:#888;font-size:13px;">Reason</td>
           <td style="padding:10px 0;color:#fff;font-size:13px;">${reason || "—"}</td>
         </tr>
       </table>
       <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://codefounder.ai"}/hr"
          style="background:#f97316;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:inline-block;">
         Review in Dashboard →
       </a>`
    );
    await sendEmail(approverEmail, `Leave Request: ${employeeName} — ${leaveType}`, html);
  }

  return NextResponse.json({ success: true });
}
