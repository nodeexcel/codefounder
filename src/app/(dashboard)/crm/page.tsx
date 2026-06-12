"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase";

interface CRMContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: "voice_agent" | "form" | "manual";
  pipeline_stage: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
}

interface FollowUp {
  id: string;
  message: string;
  channel: "email" | "sms" | "both";
  scheduled_at: string | null;
  sent_at: string | null;
  status: "pending" | "sent" | "failed";
  created_at: string;
  crm_contacts: { id: string; name: string; email: string; phone: string } | null;
}

interface Interaction {
  id: string;
  type: "call" | "email" | "sms" | "note";
  content: string;
  created_at: string;
}

const DEFAULT_STAGES = [
  { name: "New Lead",  color: "#3b82f6", order_index: 0 },
  { name: "Contacted", color: "#eab308", order_index: 1 },
  { name: "Qualified", color: "#8b5cf6", order_index: 2 },
  { name: "Proposal",  color: "#f97316", order_index: 3 },
  { name: "Won",       color: "#22c55e", order_index: 4 },
  { name: "Lost",      color: "#ef4444", order_index: 5 },
];

const SOURCE_LABELS: Record<string, string> = {
  voice_agent: "Voice Call",
  form: "Form",
  manual: "Manual",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  both: "Email + SMS",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border2)",
  color: "var(--foreground)",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
};

const CARD: React.CSSProperties = {
  background: "var(--card-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "24px",
};

function StageDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

function StatusBadge({ status }: { status: "pending" | "sent" | "failed" }) {
  const map = {
    pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308", label: "Pending" },
    sent:    { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Sent" },
    failed:  { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Failed" },
  };
  const s = map[status];
  return <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

// ─── Contact Detail Slide-over ────────────────────────────────────────────────
function ContactDetail({
  contact,
  stages,
  onClose,
  onUpdate,
  onFollowUp,
}: {
  contact: CRMContact;
  stages: PipelineStage[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<CRMContact>) => void;
  onFollowUp: (contactId: string, message: string, channel: string, sendNow: boolean) => Promise<void>;
}) {
  const supabase = createClient();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editNotes, setEditNotes] = useState(contact.notes);
  const [editStage, setEditStage] = useState(contact.pipeline_stage);
  const [savingContact, setSavingContact] = useState(false);

  // Follow-up state
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [fuMessage, setFuMessage] = useState("");
  const [fuChannel, setFuChannel] = useState<"email" | "sms" | "both">("email");
  const [fuSendNow, setFuSendNow] = useState(true);
  const [fuSending, setFuSending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingHistory(true);
      const { data } = await supabase
        .from("crm_interactions")
        .select("id, type, content, created_at")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });
      setInteractions((data ?? []) as Interaction[]);
      setLoadingHistory(false);
    }
    load();
  }, [contact.id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await supabase.from("crm_interactions").insert({
      user_id: contact.id, // placeholder — contact.user_id not available here
      contact_id: contact.id,
      type: "note",
      content: noteText.trim(),
    });
    setInteractions((prev) => [
      { id: Math.random().toString(), type: "note", content: noteText.trim(), created_at: new Date().toISOString() },
      ...prev,
    ]);
    setNoteText("");
    setAddingNote(false);
  }

  async function saveChanges() {
    setSavingContact(true);
    await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, notes: editNotes, pipeline_stage: editStage }),
    });
    onUpdate(contact.id, { notes: editNotes, pipeline_stage: editStage });
    setSavingContact(false);
  }

  async function handleFollowUp() {
    if (!fuMessage.trim()) return;
    setFuSending(true);
    await onFollowUp(contact.id, fuMessage, fuChannel, fuSendNow);
    setFuMessage("");
    setShowFollowUp(false);
    setFuSending(false);
  }

  const INTERACTION_ICONS: Record<string, string> = { call: "📞", email: "📧", sms: "💬", note: "📝" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-y-auto"
        style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div>
            <p className="font-heading text-lg font-bold text-white">{contact.name}</p>
            <p className="text-xs text-[#888]">{contact.company || contact.email || contact.phone || "No details"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#888] transition-colors hover:text-white" style={{ background: "var(--surface)" }}>✕</button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Contact info */}
          <div className="space-y-2 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {[
              { label: "Email", value: contact.email },
              { label: "Phone", value: contact.phone },
              { label: "Company", value: contact.company },
              { label: "Source", value: SOURCE_LABELS[contact.source] ?? contact.source },
              { label: "Created", value: new Date(contact.created_at).toLocaleDateString() },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#888]">{label}</span>
                  <span className="font-medium text-white">{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Stage */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Pipeline stage</label>
            <select
              style={{ ...inputStyle, background: "var(--card-elevated)" }}
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.name} style={{ background: "var(--card-elevated)" }}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Notes</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>

          <Button onClick={saveChanges} disabled={savingContact} size="md">
            {savingContact ? "Saving…" : "Save changes"}
          </Button>

          {/* Follow-up */}
          <div>
            <button
              onClick={() => setShowFollowUp((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent-glow)", border: "1px solid rgba(255,122,26,0.3)" }}
            >
              <span>✉️ Send follow-up</span>
              <span className="text-[#888]">{showFollowUp ? "▲" : "▼"}</span>
            </button>
            {showFollowUp && (
              <div className="mt-2 space-y-3 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  placeholder="Your follow-up message…"
                  value={fuMessage}
                  onChange={(e) => setFuMessage(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {(["email", "sms", "both"] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setFuChannel(ch)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                      style={{
                        background: fuChannel === ch ? "var(--accent)" : "var(--card-elevated)",
                        color: fuChannel === ch ? "white" : "var(--muted)",
                        border: `1px solid ${fuChannel === ch ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#aaa]">
                  <input type="checkbox" checked={fuSendNow} onChange={(e) => setFuSendNow(e.target.checked)} className="accent-[var(--accent)]" />
                  Send immediately
                </label>
                <Button onClick={handleFollowUp} disabled={fuSending || !fuMessage.trim()} size="md">
                  {fuSending ? "Sending…" : "Send follow-up"}
                </Button>
              </div>
            )}
          </div>

          {/* Interaction history */}
          <div>
            <p className="mb-3 font-heading text-sm font-semibold text-white">Interaction history</p>

            {/* Add note */}
            <div className="mb-3 flex gap-2">
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
              />
              <button
                onClick={addNote}
                disabled={addingNote || !noteText.trim()}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors"
                style={{ background: "var(--accent)", opacity: !noteText.trim() ? 0.5 : 1 }}
              >
                Add
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              </div>
            ) : interactions.length === 0 ? (
              <p className="text-center text-sm text-[#666]">No interactions yet</p>
            ) : (
              <div className="space-y-2">
                {interactions.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-lg p-3" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                    <span className="text-base">{INTERACTION_ICONS[item.type] ?? "📌"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#ccc]">{item.content}</p>
                      <p className="mt-0.5 text-xs text-[#555]">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────
function AddContactModal({
  stages,
  onClose,
  onAdded,
}: {
  stages: PipelineStage[];
  onClose: () => void;
  onAdded: (contact: CRMContact) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState(stages[0]?.name ?? "New Lead");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company, pipeline_stage: stage }),
      });
      const data = await res.json() as { success?: boolean; id?: string; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? "Save failed"); return; }
      onAdded({
        id: data.id!,
        name, email, phone, company,
        source: "manual",
        pipeline_stage: stage,
        notes: "",
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border2)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-white">Add contact</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#888] hover:text-white" style={{ background: "var(--surface)" }}>✕</button>
        </div>
        <Input label="Name *" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone" type="tel" placeholder="+1 555 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Company" placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Pipeline stage</label>
          <select style={{ ...inputStyle, background: "var(--card-elevated)" }} value={stage} onChange={(e) => setStage(e.target.value)}>
            {stages.map((s) => <option key={s.id} value={s.name} style={{ background: "var(--card-elevated)" }}>{s.name}</option>)}
          </select>
        </div>
        {error && <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={saving} size="md">{saving ? "Adding…" : "Add contact"}</Button>
          <Button onClick={onClose} variant="secondary" size="md">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CRMPage() {
  const supabase = createClient();

  const [agentReady, setAgentReady] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "contacts" | "followups" | "analytics">("pipeline");

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);

  // Contacts tab filter
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");

  // Kanban drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  // Import from voice
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: session } = await supabase
        .from("agent_wizard_sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("agent_type", "crm")
        .maybeSingle();

      if (session) {
        setAgentReady(true);
        setIsLive(session.status === "live");
      }
      setLoading(false);
    }
    init();
  }, []);

  const loadData = useCallback(async () => {
    const [stagesRes, contactsRes, followUpsRes] = await Promise.all([
      fetch("/api/crm/pipeline"),
      fetch("/api/crm/contacts"),
      fetch("/api/crm/follow-up"),
    ]);
    const [sd, cd, fd] = await Promise.all([
      stagesRes.json() as Promise<{ stages?: PipelineStage[] }>,
      contactsRes.json() as Promise<{ contacts?: CRMContact[] }>,
      followUpsRes.json() as Promise<{ followUps?: FollowUp[] }>,
    ]);

    let loadedStages = sd.stages ?? [];
    if (!loadedStages.length) {
      // Seed defaults on first load
      await fetch("/api/crm/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: DEFAULT_STAGES }),
      });
      // Re-fetch
      const r2 = await fetch("/api/crm/pipeline");
      const d2 = await r2.json() as { stages?: PipelineStage[] };
      loadedStages = d2.stages ?? DEFAULT_STAGES.map((s, i) => ({ ...s, id: String(i) }));
    }

    setStages(loadedStages);
    setContacts(cd.contacts ?? []);
    setFollowUps(fd.followUps ?? []);
  }, []);

  useEffect(() => {
    if (!agentReady) return;
    loadData();
  }, [agentReady, loadData]);

  async function moveContact(contactId: string, newStage: string) {
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, pipeline_stage: newStage } : c));
    await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contactId, pipeline_stage: newStage }),
    });
  }

  async function deleteContact(id: string) {
    await fetch(`/api/crm/contacts?id=${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  }

  async function sendFollowUp(contactId: string, message: string, channel: string, sendNow: boolean) {
    const res = await fetch("/api/crm/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, message, channel, sendNow }),
    });
    if (res.ok) {
      // Refresh follow-ups
      const r = await fetch("/api/crm/follow-up");
      const d = await r.json() as { followUps?: FollowUp[] };
      setFollowUps(d.followUps ?? []);
    }
  }

  async function importFromVoice() {
    setImporting(true);
    setImportMsg(null);
    const res = await fetch("/api/crm/import-from-voice", { method: "POST" });
    const data = await res.json() as { imported?: number; message?: string; error?: string };
    if (res.ok) {
      setImportMsg(data.message ?? `Imported ${data.imported} contacts`);
      await loadData();
    } else {
      setImportMsg(data.error ?? "Import failed");
    }
    setImporting(false);
  }

  if (loading) {
    return (
      <>
        <DashboardNavbar title="CRM Agent" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[#888]">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          Loading…
        </div>
      </>
    );
  }

  if (!agentReady) {
    return (
      <>
        <DashboardNavbar title="CRM Agent" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-5xl">🎯</span>
          <h2 className="font-heading text-xl font-bold text-white">CRM Agent not set up</h2>
          <p className="max-w-xs text-sm text-[#888]">Set up your CRM Agent to capture leads, manage your pipeline, and automate follow-ups.</p>
          <Button href="/wizard?agent=crm">Set up CRM Agent →</Button>
        </div>
      </>
    );
  }

  const TABS = [
    { id: "pipeline"  as const, label: "🎯 Pipeline" },
    { id: "contacts"  as const, label: `👤 Contacts${contacts.length ? ` (${contacts.length})` : ""}` },
    { id: "followups" as const, label: `✉️ Follow-ups${followUps.length ? ` (${followUps.length})` : ""}` },
    { id: "analytics" as const, label: "📊 Analytics" },
  ];

  // Contacts tab filtered list
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q) || c.company.toLowerCase().includes(q);
    const matchStage = filterStage === "all" || c.pipeline_stage === filterStage;
    return matchSearch && matchStage;
  });

  // Analytics numbers
  const byStage: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const c of contacts) {
    byStage[c.pipeline_stage] = (byStage[c.pipeline_stage] ?? 0) + 1;
    bySource[c.source] = (bySource[c.source] ?? 0) + 1;
  }
  const wonCount = byStage["Won"] ?? 0;
  const conversionRate = contacts.length > 0 ? Math.round((wonCount / contacts.length) * 100) : 0;

  const stageColor = (name: string) =>
    stages.find((s) => s.name === name)?.color ??
    DEFAULT_STAGES.find((s) => s.name === name)?.color ?? "#6b7280";

  return (
    <>
      <DashboardNavbar title="CRM Agent" subtitle={isLive ? "Live" : "Draft"} />

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          stages={stages}
          onClose={() => setSelectedContact(null)}
          onUpdate={(id, patch) => {
            setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
            setSelectedContact((prev) => prev ? { ...prev, ...patch } : prev);
          }}
          onFollowUp={sendFollowUp}
        />
      )}

      {showAddContact && (
        <AddContactModal
          stages={stages}
          onClose={() => setShowAddContact(false)}
          onAdded={(c) => { setContacts((prev) => [c, ...prev]); }}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] space-y-6">
        {/* Top toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddContact(true)} size="sm">+ Add contact</Button>
            <Button onClick={importFromVoice} disabled={importing} variant="secondary" size="sm">
              {importing ? "Importing…" : "⬇ Import from Voice calls"}
            </Button>
          </div>
          {importMsg && (
            <p className="text-xs text-[#888]">{importMsg}</p>
          )}
          <Button href="/wizard?agent=crm&reconfigure=true" variant="ghost" size="sm">
            {isLive ? "Reconfigure" : "Complete setup →"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg p-1" style={{ background: "var(--surface)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-all"
              style={tab === t.id
                ? { background: "var(--card-elevated)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
                : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Pipeline Kanban ── */}
        {tab === "pipeline" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: `${stages.length * 256}px` }}>
              {stages.map((stage) => {
                const stageContacts = contacts.filter((c) => c.pipeline_stage === stage.name);
                const isDragOver = dragOverStage === stage.name;
                return (
                  <div
                    key={stage.id}
                    className="flex w-60 shrink-0 flex-col rounded-xl"
                    style={{
                      background: isDragOver ? "rgba(255,122,26,0.06)" : "var(--card-elevated)",
                      border: `1px solid ${isDragOver ? "rgba(255,122,26,0.4)" : "var(--border)"}`,
                      transition: "all 0.15s",
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.name); }}
                    onDragEnter={() => {
                      dragCounter.current[stage.name] = (dragCounter.current[stage.name] ?? 0) + 1;
                      setDragOverStage(stage.name);
                    }}
                    onDragLeave={() => {
                      dragCounter.current[stage.name] = (dragCounter.current[stage.name] ?? 1) - 1;
                      if (!dragCounter.current[stage.name]) setDragOverStage(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const contactId = e.dataTransfer.getData("contactId");
                      if (contactId) moveContact(contactId, stage.name);
                      setDragOverStage(null);
                      dragCounter.current[stage.name] = 0;
                    }}
                  >
                    {/* Stage header */}
                    <div className="flex items-center justify-between rounded-t-xl px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <StageDot color={stage.color} />
                        <span className="text-sm font-semibold text-white">{stage.name}</span>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                        {stageContacts.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 space-y-2 p-2">
                      {stageContacts.map((contact) => (
                        <div
                          key={contact.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("contactId", contact.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(contact.id);
                          }}
                          onDragEnd={() => setDraggingId(null)}
                          onClick={() => setSelectedContact(contact)}
                          className="cursor-pointer rounded-lg p-3 transition-all"
                          style={{
                            background: "var(--surface)",
                            border: `1px solid ${draggingId === contact.id ? "rgba(255,122,26,0.4)" : "var(--border)"}`,
                            opacity: draggingId === contact.id ? 0.5 : 1,
                            userSelect: "none",
                          }}
                        >
                          <p className="font-medium text-white text-sm leading-tight">{contact.name}</p>
                          {contact.company && <p className="mt-0.5 text-xs text-[#888]">{contact.company}</p>}
                          {contact.email && <p className="mt-0.5 text-xs text-[#666] truncate">{contact.email}</p>}
                          {contact.phone && !contact.email && <p className="mt-0.5 text-xs text-[#666]">{contact.phone}</p>}
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--card-elevated)", color: "var(--muted)" }}>
                              {SOURCE_LABELS[contact.source] ?? contact.source}
                            </span>
                          </div>
                        </div>
                      ))}

                      {stageContacts.length === 0 && (
                        <div className="flex items-center justify-center rounded-lg py-6" style={{ border: "1px dashed var(--border)", color: "#444" }}>
                          <p className="text-xs">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Contacts Table ── */}
        {tab === "contacts" && (
          <div style={CARD}>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48">
                <input
                  style={inputStyle}
                  placeholder="Search contacts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                style={{ ...inputStyle, width: "auto" }}
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
              >
                <option value="all">All stages</option>
                {stages.map((s) => <option key={s.id} value={s.name} style={{ background: "var(--card-elevated)" }}>{s.name}</option>)}
              </select>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">👤</span>
                <p className="mt-3 text-sm text-[#888]">
                  {contacts.length === 0 ? "No contacts yet." : "No contacts match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Name", "Email", "Phone", "Company", "Stage", "Source", "Added"].map((h) => (
                        <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[#666]">{h}</th>
                      ))}
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-[#666]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="group transition-colors hover:bg-[var(--surface)]" style={{ cursor: "pointer" }} onClick={() => setSelectedContact(c)}>
                        <td className="py-3 pr-4 font-medium text-white">{c.name}</td>
                        <td className="py-3 pr-4 text-[#888]">{c.email || "—"}</td>
                        <td className="py-3 pr-4 text-[#888]">{c.phone || "—"}</td>
                        <td className="py-3 pr-4 text-[#888]">{c.company || "—"}</td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1.5">
                            <StageDot color={stageColor(c.pipeline_stage)} />
                            <span className="text-[#ccc]">{c.pipeline_stage}</span>
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[#888]">{SOURCE_LABELS[c.source] ?? c.source}</td>
                        <td className="py-3 pr-4 text-[#888]">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteContact(c.id)}
                            className="text-xs text-[#555] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Follow-ups ── */}
        {tab === "followups" && (
          <div style={CARD}>
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-white">Follow-up sequences</h3>
              <p className="mt-0.5 text-sm text-[#888]">Track all automated and manual follow-up messages</p>
            </div>

            {followUps.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">✉️</span>
                <p className="mt-3 text-sm text-[#888]">No follow-ups yet. Open a contact to send one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="flex items-start gap-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => fu.crm_contacts && setSelectedContact({ ...fu.crm_contacts, company: "", source: "manual", pipeline_stage: "", notes: "", tags: [], created_at: "", updated_at: "" })}
                          className="font-medium text-white hover:underline text-sm"
                        >
                          {fu.crm_contacts?.name ?? "Unknown contact"}
                        </button>
                        <StatusBadge status={fu.status} />
                        <span className="text-xs text-[#666]">{CHANNEL_LABELS[fu.channel]}</span>
                      </div>
                      <p className="text-sm text-[#ccc] line-clamp-2">{fu.message}</p>
                      <p className="mt-1 text-xs text-[#555]">
                        {fu.sent_at
                          ? `Sent ${new Date(fu.sent_at).toLocaleString()}`
                          : fu.scheduled_at
                            ? `Scheduled for ${new Date(fu.scheduled_at).toLocaleString()}`
                            : `Created ${new Date(fu.created_at).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total contacts", value: contacts.length, icon: "👤", color: "#3b82f6" },
                { label: "Won",            value: wonCount,         icon: "🏆", color: "#22c55e" },
                { label: "Conversion rate", value: `${conversionRate}%`, icon: "📈", color: "#f97316" },
                { label: "Follow-ups sent", value: followUps.filter((f) => f.status === "sent").length, icon: "✉️", color: "#8b5cf6" },
              ].map((stat) => (
                <div key={stat.label} style={CARD} className="text-center">
                  <div className="text-3xl">{stat.icon}</div>
                  <div className="mt-2 font-heading text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-sm text-[#888]">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* By stage */}
              <div style={CARD}>
                <h3 className="mb-4 font-heading font-semibold text-white">Contacts by stage</h3>
                <div className="space-y-3">
                  {stages.map((stage) => {
                    const count = byStage[stage.name] ?? 0;
                    const max = Math.max(...stages.map((s) => byStage[s.name] ?? 0), 1);
                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm text-[#888] truncate">{stage.name}</span>
                        <div className="flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface)", height: 8 }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / max) * 100}%`, background: stage.color }} />
                        </div>
                        <span className="w-6 text-right text-sm font-semibold text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By source */}
              <div style={CARD}>
                <h3 className="mb-4 font-heading font-semibold text-white">Contacts by source</h3>
                <div className="space-y-3">
                  {Object.entries(bySource).map(([src, count]) => (
                    <div key={src} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--surface)" }}>
                      <span className="text-sm text-[#ccc]">{SOURCE_LABELS[src] ?? src}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                  ))}
                  {Object.keys(bySource).length === 0 && (
                    <p className="text-sm text-[#666]">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
