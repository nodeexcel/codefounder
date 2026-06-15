"use client";

import { useRef, useState } from "react";

interface Props {
  assistantId: string;
}

// Vapi fires an "error" event on assistant-initiated endCall (normal hangup).
// This function returns true for those false-positive errors so we can suppress
// the error UI. Real failures — mic not found, network, auth — are not matched.
function isFalsePositiveVapiError(err: unknown): boolean {
  if (err === null || err === undefined) return true;
  const raw = typeof err === "object" ? JSON.stringify(err) : String(err);
  // Vapi emits these codes/messages on a clean assistant-initiated call end
  const falsePositivePatterns = [
    "call-end",
    "Meeting has ended",
    "Call has ended",
    "ended",
  ];
  return falsePositivePatterns.some((p) => raw.toLowerCase().includes(p.toLowerCase()));
}

function isRealError(err: unknown): boolean {
  if (err === null || err === undefined) return false;
  const raw = typeof err === "object" ? JSON.stringify(err) : String(err);
  const realErrorPatterns = [
    "microphone",
    "NotFoundError",
    "NotAllowedError",
    "network",
    "401",
    "unauthorized",
    "permission denied",
  ];
  return realErrorPatterns.some((p) => raw.toLowerCase().includes(p.toLowerCase()));
}

export function TestCallButton({ assistantId }: Props) {
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micModalOpen, setMicModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<import("@vapi-ai/web").default | null>(null);
  // Tracks whether the call ever reached active state. Used to detect
  // assistant-initiated hangup, which Vapi surfaces as an "error" event
  // after a normal call-end sequence.
  const callWasActiveRef = useRef(false);

  async function startCall() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not configured.");
      return;
    }
    setError(null);
    setConnecting(true);
    callWasActiveRef.current = false;

    try {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        callWasActiveRef.current = true;
        setConnecting(false);
        setActive(true);
      });
      vapi.on("call-end", () => {
        setActive(false);
        setConnecting(false);
        vapiRef.current = null;
      });
      vapi.on("error", (err: unknown) => {
        // Always log the raw payload for Vercel log visibility
        console.error("[TestCallButton] vapi error event:", err);

        setActive(false);
        setConnecting(false);
        vapiRef.current = null;

        // If the call was already active, this error is almost certainly the
        // Vapi SDK's false-positive fired on assistant-initiated endCall.
        // Suppress it — call-end has already cleaned up state correctly.
        if (callWasActiveRef.current) {
          if (!isRealError(err)) {
            return;
          }
        }

        // For errors before the call started, suppress known false positives too
        if (isFalsePositiveVapiError(err)) {
          return;
        }

        // Extract a human-readable message for real failures
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Test call encountered an error. Please try again.";
        setError(msg);
      });

      await vapi.start(assistantId);
      setConnecting(false);
    } catch (err) {
      vapiRef.current = null;
      setConnecting(false);
      setError(err instanceof Error ? err.message : "Failed to start test call.");
    }
  }

  async function handleClick() {
    if (active || connecting) {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setActive(false);
      setConnecting(false);
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        await startCall();
      } else {
        setMicModalOpen(true);
      }
    } catch {
      setMicModalOpen(true);
    }
  }

  async function handleGrantMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicModalOpen(false);
      await startCall();
    } catch {
      setMicModalOpen(false);
      setError("Microphone access denied. Please allow it in your browser settings.");
    }
  }

  return (
    <>
      {error && (
        <p className="mb-2 text-xs text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-60"
        style={{
          background: active ? "rgba(239,68,68,0.12)" : "var(--surface)",
          border: `1px solid ${active ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
          color: active ? "#EF4444" : "var(--foreground)",
        }}
      >
        {active ? "🔴 End call" : connecting ? "⏳ Connecting…" : "🎙️ Test call"}
      </button>

      {active && (
        <p className="mt-2 text-xs animate-pulse" style={{ color: "#E87B2C" }}>
          Call in progress — speak now…
        </p>
      )}

      {micModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border2)", boxShadow: "var(--shadow-card-hover)" }}
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(232,123,44,0.10)", border: "1px solid rgba(232,123,44,0.20)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <h3 className="text-center text-base font-bold" style={{ color: "var(--foreground)" }}>
              Microphone Access Required
            </h3>
            <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
              Allow microphone access to test your AI agent live.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-medium"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--muted)" }}
                onClick={() => setMicModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-all"
                style={{ background: "var(--accent)" }}
                onClick={handleGrantMic}
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
