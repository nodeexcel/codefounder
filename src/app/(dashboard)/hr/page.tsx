"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";

interface KnowledgeFile {
  id: string;
  filename: string;
  created_at: string;
}

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_email: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface OnboardingChecklist {
  id: string;
  employee_name: string;
  employee_email: string;
  status: string;
  checklist_items: { task: string; done: boolean }[];
  created_at: string;
}

const CARD: React.CSSProperties = {
  background: "var(--card-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "24px",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "rgba(234,179,8,0.1)",  color: "#eab308" },
  approved: { bg: "rgba(34,197,94,0.1)",  color: "#22c55e" },
  rejected: { bg: "rgba(239,68,68,0.1)",  color: "#ef4444" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "var(--surface2)", color: "var(--muted)" };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

export default function HRPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("HR Assistant");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"knowledge" | "leaves" | "onboarding" | "embed">("knowledge");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: session } = await supabase
        .from("agent_wizard_sessions")
        .select("id, status, voice_settings")
        .eq("user_id", user.id)
        .eq("agent_type", "hr")
        .maybeSingle();

      if (!session) { setLoading(false); return; }

      setAgentId(session.id);
      setIsLive(session.status === "live");
      const settings = session.voice_settings as { agentName?: string } | null;
      if (settings?.agentName) setAgentName(settings.agentName);

      const [{ data: kbData }, { data: leaveData }, { data: checklistData }] = await Promise.all([
        supabase.from("hr_knowledge_base").select("id, filename, created_at").eq("agent_id", session.id).order("created_at", { ascending: false }),
        supabase.from("hr_leave_requests").select("*").eq("agent_id", session.id).order("created_at", { ascending: false }),
        supabase.from("hr_onboarding_checklists").select("*").eq("agent_id", session.id).order("created_at", { ascending: false }),
      ]);

      setFiles((kbData ?? []) as KnowledgeFile[]);
      setLeaves((leaveData ?? []) as LeaveRequest[]);
      setChecklists((checklistData ?? []) as OnboardingChecklist[]);
      setLoading(false);
    }
    init();
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/hr/upload-knowledge", { method: "POST", body: fd });
      const result = await res.json() as { success?: boolean; error?: string; filename?: string };
      if (!res.ok || !result.success) {
        setUploadError(result.error ?? "Upload failed");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && agentId) {
          const { data: fresh } = await supabase
            .from("hr_knowledge_base")
            .select("id, filename, created_at")
            .eq("agent_id", agentId)
            .order("created_at", { ascending: false });
          setFiles((fresh ?? []) as KnowledgeFile[]);
        }
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteFile(id: string) {
    await supabase.from("hr_knowledge_base").delete().eq("id", id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function updateLeaveStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("hr_leave_requests").update({ status }).eq("id", id);
    if (!error) {
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    }
  }

  const chatUrl = agentId ? `${typeof window !== "undefined" ? window.location.origin : "https://codefounder.ai"}/hr-chat/${agentId}` : "";
  const embedCode = `<iframe\n  src="${chatUrl}"\n  width="420"\n  height="640"\n  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"\n  allow="clipboard-write"\n></iframe>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <>
        <DashboardNavbar title="HR Agent" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[#888]">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          Loading...
        </div>
      </>
    );
  }

  if (!agentId) {
    return (
      <>
        <DashboardNavbar title="HR Agent" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-5xl">👥</span>
          <h2 className="font-heading text-xl font-bold text-white">HR Agent not set up</h2>
          <p className="max-w-xs text-sm text-[#888]">Set up your HR Agent to start answering employee questions, managing leave requests, and more.</p>
          <Button href="/wizard?agent=hr">Set up HR Agent →</Button>
        </div>
      </>
    );
  }

  const TABS = [
    { id: "knowledge" as const, label: "Knowledge Base" },
    { id: "leaves" as const, label: `Leave Requests${leaves.filter(l => l.status === "pending").length ? ` (${leaves.filter(l => l.status === "pending").length})` : ""}` },
    { id: "onboarding" as const, label: "Onboarding" },
    { id: "embed" as const, label: "Chat Widget" },
  ];

  return (
    <>
      <DashboardNavbar
        title="HR Agent"
        subtitle={isLive ? `${agentName} — Live` : `${agentName} — Draft`}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
        {/* Status bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl px-5 py-4"
          style={{ background: isLive ? "rgba(34,197,94,0.05)" : "var(--card-elevated)", border: `1px solid ${isLive ? "rgba(34,197,94,0.25)" : "var(--border)"}` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-heading font-semibold text-white">{agentName}</p>
              <p className="text-xs text-[#888]">{isLive ? "Your HR Agent is live" : "Complete the wizard to go live"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isLive && chatUrl && (
              <Button href={chatUrl} variant="secondary" size="sm">Open chat ↗</Button>
            )}
            <Button href={`/wizard?agent=hr&reconfigure=true`} variant="ghost" size="sm">
              {isLive ? "Reconfigure" : "Complete setup →"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all"
              style={tab === t.id
                ? { background: "var(--card-elevated)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
                : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Knowledge Base tab */}
        {tab === "knowledge" && (
          <div style={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-white">Knowledge Base</h3>
                <p className="mt-0.5 text-sm text-[#888]">Upload handbooks, policies, and other HR documents</p>
              </div>
              <div>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
                  {uploading ? "Uploading…" : "+ Upload file"}
                </Button>
              </div>
            </div>
            {uploadError && (
              <p className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{uploadError}</p>
            )}
            {files.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">📄</span>
                <p className="mt-3 text-sm text-[#888]">No files uploaded yet. Upload your employee handbook or HR policies to get started.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📄</span>
                      <div>
                        <p className="text-sm font-medium text-white">{f.filename}</p>
                        <p className="text-xs text-[#666]">{new Date(f.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteFile(f.id)}
                      className="text-xs text-[#555] hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Leave Requests tab */}
        {tab === "leaves" && (
          <div style={CARD}>
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-white">Leave Requests</h3>
              <p className="mt-0.5 text-sm text-[#888]">Review and approve employee leave requests</p>
            </div>
            {leaves.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">📅</span>
                <p className="mt-3 text-sm text-[#888]">No leave requests yet. They'll appear here once employees submit them via the chat widget.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((l) => (
                  <div key={l.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{l.employee_name}</p>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-[#888]">{l.employee_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{l.leave_type}</p>
                        <p className="text-xs text-[#888]">{l.start_date} → {l.end_date}</p>
                      </div>
                    </div>
                    {l.reason && (
                      <p className="mt-2 text-sm text-[#888]">&ldquo;{l.reason}&rdquo;</p>
                    )}
                    {l.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => updateLeaveStatus(l.id, "approved")}
                          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(l.id, "rejected")}
                          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onboarding tab */}
        {tab === "onboarding" && (
          <div style={CARD}>
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-white">Onboarding Checklists</h3>
              <p className="mt-0.5 text-sm text-[#888]">Track employee onboarding progress</p>
            </div>
            {checklists.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">✅</span>
                <p className="mt-3 text-sm text-[#888]">No onboarding checklists yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists.map((c) => {
                  const items = Array.isArray(c.checklist_items) ? c.checklist_items : [];
                  const done = items.filter((i) => i.done).length;
                  return (
                    <div key={c.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{c.employee_name}</p>
                          <p className="text-xs text-[#888]">{c.employee_email}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      {items.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 flex justify-between text-xs text-[#888]">
                            <span>Progress</span>
                            <span>{done}/{items.length}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, background: "var(--accent)" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Embed tab */}
        {tab === "embed" && (
          <div style={CARD}>
            <div className="mb-6">
              <h3 className="font-heading font-semibold text-white">Chat Widget</h3>
              <p className="mt-0.5 text-sm text-[#888]">Embed the HR chat widget on your intranet or internal site</p>
            </div>

            {chatUrl && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="flex-1 truncate text-sm text-[#888]">{chatUrl}</p>
                <Button href={chatUrl} variant="secondary" size="sm">Open ↗</Button>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-[#aaa]">Embed code</p>
              <div className="relative rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-[#888]">{embedCode}</pre>
                <button
                  onClick={copyEmbed}
                  className="absolute right-3 top-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{ background: copied ? "rgba(34,197,94,0.1)" : "var(--card-elevated)", color: copied ? "#22c55e" : "var(--muted)", border: `1px solid ${copied ? "rgba(34,197,94,0.2)" : "var(--border2)"}` }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#555]">Paste this code into any HTML page to embed the HR chat widget.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
