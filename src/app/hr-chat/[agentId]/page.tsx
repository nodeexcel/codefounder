"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const DEFAULT_LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Parental Leave", "Unpaid Leave", "Bereavement Leave"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: 500,
  color: "#888",
};

export default function HRChatPage() {
  const { agentId } = useParams<{ agentId: string }>();

  const [agentName, setAgentName] = useState("HR Assistant");
  const [companyName, setCompanyName] = useState("");
  const [leaveTypes, setLeaveTypes] = useState<string[]>(DEFAULT_LEAVE_TYPES);
  const [agentReady, setAgentReady] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"chat" | "leave">("chat");

  // Leave request form
  const [leaveName, setLeaveName] = useState("");
  const [leaveEmail, setLeaveEmail] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/hr/meta?agentId=${agentId}`);
        if (res.ok) {
          const data = await res.json() as { agentName?: string; companyName?: string; leaveTypes?: string[] };
          if (data.agentName) setAgentName(data.agentName);
          if (data.companyName) setCompanyName(data.companyName);
          if (data.leaveTypes?.length) setLeaveTypes(data.leaveTypes);
        }
      } catch {
        // non-fatal: fallback to defaults
      }
      setAgentReady(true);
      setMessages([{ role: "assistant", text: `Hi! I'm your HR Assistant${companyName ? ` for ${companyName}` : ""}. Ask me anything about company policies, benefits, leave, or other HR matters. I'm here to help!` }]);
    }
    if (agentId) fetchMeta();
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setSending(true);
    try {
      const res = await fetch("/api/hr/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, question }),
      });
      const data = await res.json() as { answer?: string; error?: string };
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: data.answer ?? data.error ?? "Sorry, I couldn't get a response. Please try again.",
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  async function submitLeaveRequest() {
    if (!leaveName || !leaveEmail || !leaveType || !leaveStart || !leaveEnd) {
      setLeaveError("Please fill in all required fields.");
      return;
    }
    if (leaveEnd < leaveStart) {
      setLeaveError("End date must be on or after the start date.");
      return;
    }
    setLeaveError(null);
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/hr/leave-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          employeeName: leaveName,
          employeeEmail: leaveEmail,
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setLeaveError(data.error ?? "Submission failed. Please try again.");
      } else {
        setLeaveSubmitted(true);
      }
    } catch {
      setLeaveError("Network error. Please try again.");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px 40px",
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            👥
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{agentName}</p>
            {companyName && <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{companyName}</p>}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#22c55e",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Online
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          gap: 4,
          background: "#1a1a1a",
          borderRadius: 10,
          padding: 4,
          marginBottom: 20,
        }}
      >
        {(["chat", "leave"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#111" : "#888",
            }}
          >
            {t === "chat" ? "💬 Ask HR" : "📅 Leave Request"}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === "chat" && (
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            background: "#111",
            border: "1px solid #222",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Messages */}
          <div style={{ flex: 1, minHeight: 360, maxHeight: 480, overflowY: "auto", padding: "16px 16px 8px" }}>
            {!agentReady ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32, color: "#555" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #f97316", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      background: m.role === "user" ? "#f97316" : "#1e1e1e",
                      color: m.role === "user" ? "#fff" : "#e5e5e5",
                      border: m.role === "assistant" ? "1px solid #2a2a2a" : "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div style={{ display: "flex", gap: 4, padding: "4px 0 8px" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#555",
                      animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #1e1e1e" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Ask about leave, benefits, policies…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={sending || !agentReady}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim() || !agentReady}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                  background: sending || !input.trim() ? "#333" : "#f97316",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave request tab */}
      {tab === "leave" && (
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "#111",
            border: "1px solid #222",
            borderRadius: 16,
            padding: 24,
          }}
        >
          {leaveSubmitted ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Request Submitted!</h3>
              <p style={{ color: "#888", fontSize: 14, margin: "0 0 24px" }}>
                Your leave request has been submitted and is pending approval. You&apos;ll be notified once it&apos;s reviewed.
              </p>
              <button
                onClick={() => { setLeaveSubmitted(false); setLeaveName(""); setLeaveEmail(""); setLeaveType(""); setLeaveStart(""); setLeaveEnd(""); setLeaveReason(""); }}
                style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
              >
                Submit another request
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Submit a Leave Request</h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>Fill in the details below and your manager will be notified.</p>

              {leaveError && (
                <p style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                  {leaveError}
                </p>
              )}

              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input style={inputStyle} placeholder="Jane Smith" value={leaveName} onChange={(e) => setLeaveName(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Email address *</label>
                  <input style={inputStyle} type="email" placeholder="jane@company.com" value={leaveEmail} onChange={(e) => setLeaveEmail(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Leave type *</label>
                  <select
                    style={inputStyle}
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                  >
                    <option value="">Select leave type…</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt} value={lt}>{lt}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Start date *</label>
                    <input style={inputStyle} type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>End date *</label>
                    <input style={inputStyle} type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Reason (optional)</label>
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                    placeholder="Brief description of your leave reason…"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
                <button
                  onClick={submitLeaveRequest}
                  disabled={leaveSubmitting}
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    border: "none",
                    background: leaveSubmitting ? "#444" : "#f97316",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: leaveSubmitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {leaveSubmitting ? "Submitting…" : "Submit Leave Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Powered by */}
      <p style={{ marginTop: 24, fontSize: 11, color: "#333" }}>
        Powered by <span style={{ color: "#f97316", fontWeight: 600 }}>CodeFounder</span>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
