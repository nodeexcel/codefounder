"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { DashboardNavbar } from "@/components/dashboard/Navbar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhoneSession {
  id: string;
  agent_type: string;
  status: "draft" | "live";
  twilio_phone_number: string | null;
  vapi_assistant_id: string | null;
  voice_settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function agentLabel(session: PhoneSession): string {
  if (session.agent_type === "voice") {
    const name = session.voice_settings?.agentName as string | undefined;
    return name?.trim() ? name.trim() : "Voice Agent";
  }
  return session.agent_type.charAt(0).toUpperCase() + session.agent_type.slice(1) + " Agent";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ background: "#22c55e" }}
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: "#22c55e" }}
      />
    </span>
  );
}

function StatusBadge({ live }: { live: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={
        live
          ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
          : { background: "var(--surface2)", color: "var(--muted)" }
      }
    >
      {live ? <ActivePulse /> : <span className="h-2 w-2 rounded-full bg-[#555]" />}
      {live ? "Active" : "Inactive"}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "US", label: "United States (+1)" },
  { code: "CA", label: "Canada (+1)" },
  { code: "GB", label: "United Kingdom (+44)" },
  { code: "AU", label: "Australia (+61)" },
];

export default function PhoneNumbersPage() {
  const [sessions, setSessions] = useState<PhoneSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Release
  const [releaseTarget, setReleaseTarget] = useState<PhoneSession | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Provision
  const [country, setCountry] = useState("US");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    phoneNumber: string;
    reused?: boolean;
  } | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  async function loadSessions(uid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("agent_wizard_sessions")
      .select(
        "id, agent_type, status, twilio_phone_number, vapi_assistant_id, voice_settings, created_at, updated_at"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setSessions((data as PhoneSession[]) ?? []);
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadSessions(user.id);
      setLoading(false);
    }
    init();
  }, []);

  // Current active voice number
  const voiceSession = sessions.find(
    (s) => s.agent_type === "voice" && s.twilio_phone_number
  ) ?? null;

  // All sessions with a number (history)
  const numberedSessions = sessions.filter((s) => s.twilio_phone_number);

  async function handleRelease() {
    if (!releaseTarget || !userId) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("agent_wizard_sessions")
        .update({
          twilio_phone_number: null,
          voice_settings: {
            ...(releaseTarget.voice_settings ?? {}),
            phoneNumber: "",
            phoneOption: "",
            vapiPhoneNumberId: null,
          },
        })
        .eq("id", releaseTarget.id)
        .eq("user_id", userId);

      if (error) {
        setReleaseError(error.message);
      } else {
        setReleaseTarget(null);
        await loadSessions(userId);
        setProvisionResult(null);
      }
    } finally {
      setReleasing(false);
    }
  }

  async function handleProvision() {
    setProvisioning(true);
    setProvisionError(null);
    setProvisionResult(null);
    try {
      if (country !== "US") {
        setProvisionError("Only US numbers are currently supported. Select United States.");
        return;
      }
      const res = await fetch("/api/phone/provision-number", { method: "POST" });
      const result = await res.json() as {
        phoneNumber?: string;
        vapiPhoneNumberId?: string | null;
        reused?: boolean;
        error?: string;
      };
      if (!res.ok || !result.phoneNumber) {
        setProvisionError(result.error ?? "Failed to provision phone number.");
        return;
      }
      setProvisionResult({ phoneNumber: result.phoneNumber, reused: result.reused });
      if (userId) await loadSessions(userId);
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProvisioning(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    overflow: "hidden",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface)",
    border: "1px solid var(--border2)",
    color: "var(--foreground)",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar title="Phone Numbers" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3" style={{ color: "var(--muted)" }}>
          <div
            className="h-6 w-6 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar title="Phone Numbers" />

      {/* Release confirmation modal */}
      {releaseTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--card-elevated)", border: "1px solid var(--border2)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
          >
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              ⚠️
            </div>
            <h3 className="text-center text-base font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
              Release number?
            </h3>
            <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                {releaseTarget.twilio_phone_number}
              </span>{" "}
              will be unassigned. The number may still incur charges until cancelled in Telnyx.
            </p>
            {releaseError && (
              <p className="mt-3 rounded-lg px-3 py-2 text-xs text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                {releaseError}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setReleaseTarget(null); setReleaseError(null); }}
                disabled={releasing}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "#ef4444" }}
              >
                {releasing ? "Releasing…" : "Release"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
            Manage
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em]" style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
            Phone Numbers
          </h2>
        </section>

        {/* Current Number Card */}
        <section style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                Current
              </p>
              <p className="mt-0.5 text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Assigned number
              </p>
            </div>
          </div>

          <div className="p-5">
            {voiceSession ? (
              <div
                className="relative overflow-hidden rounded-xl p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, #22c55e, transparent)" }}
                />

                {/* Number + status row */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      {/* Phone icon with pulse */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xl font-bold tracking-wide" style={{ color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                          {voiceSession.twilio_phone_number}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                          Assigned to <span className="font-semibold" style={{ color: "var(--foreground)" }}>{agentLabel(voiceSession)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <StatusBadge live={voiceSession.status === "live"} />
                    <button
                      onClick={() => setReleaseTarget(voiceSession)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                    >
                      Release Number
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div className="mt-4 flex flex-wrap gap-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-low)" }}>Provisioned</p>
                    <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--muted)" }}>{formatDateTime(voiceSession.updated_at)}</p>
                  </div>
                  {voiceSession.vapi_assistant_id && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-low)" }}>Vapi Assistant</p>
                      <p className="mt-0.5 font-mono text-xs" style={{ color: "var(--muted)" }}>
                        {voiceSession.vapi_assistant_id.slice(0, 8)}…
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center rounded-xl py-10 text-center"
                style={{ background: "var(--surface)", border: "1px dashed var(--border2)" }}
              >
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "var(--surface2)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
                  </svg>
                </div>
                <p className="font-semibold" style={{ color: "var(--foreground)" }}>No number assigned</p>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Provision a number below to get started.</p>
              </div>
            )}
          </div>
        </section>

        {/* Buy / Provision Section */}
        <section style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
              Get a number
            </p>
            <p className="mt-0.5 text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Provision new number
            </p>
          </div>

          <div className="space-y-4 p-5">
            {voiceSession && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(255,122,26,0.06)", border: "1px solid rgba(255,122,26,0.15)", color: "var(--muted)" }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>Note: </span>
                You already have a number assigned. Provisioning will return your existing number.
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={selectStyle}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,122,26,0.5)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} style={{ background: "var(--card-elevated)" }}>
                    {c.label}
                  </option>
                ))}
              </select>
              {country !== "US" && (
                <p className="mt-1.5 text-xs" style={{ color: "#f59e0b" }}>
                  ⚠ Only US numbers are supported at this time.
                </p>
              )}
            </div>

            <button
              onClick={handleProvision}
              disabled={provisioning}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
              onMouseEnter={(e) => { if (!provisioning) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              {provisioning ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2"
                    style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }}
                  />
                  Searching…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Search Available Numbers
                </>
              )}
            </button>

            {provisionError && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {provisionError}
              </div>
            )}

            {provisionResult && (
              <div
                className="relative overflow-hidden rounded-xl p-4"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, #22c55e, transparent)" }}
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ background: "rgba(34,197,94,0.12)" }}>
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: "#22c55e" }}>
                      {provisionResult.reused ? "Existing number returned" : "Number provisioned!"}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold" style={{ color: "var(--foreground)" }}>
                      {provisionResult.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Number History */}
        <section style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                History
              </p>
              <p className="mt-0.5 text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Provisioned numbers
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
            >
              {numberedSessions.length} total
            </span>
          </div>

          {numberedSessions.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No numbers provisioned yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Phone Number", "Agent", "Status", "Date Provisioned"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[2px]"
                        style={{ color: "var(--muted)", fontFamily: "var(--font-heading)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numberedSessions.map((session, i) => (
                    <tr
                      key={session.id}
                      style={{
                        borderBottom: i < numberedSessions.length - 1 ? "1px solid var(--border)" : undefined,
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {session.status === "live" && <ActivePulse />}
                          <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                            {session.twilio_phone_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3" style={{ color: "var(--muted)" }}>
                        {agentLabel(session)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge live={session.status === "live"} />
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>
                        {formatDateTime(session.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
