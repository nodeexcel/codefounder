"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  agentType: string;
  agentName: string;
}

export function DeleteAgentButton({ agentType, agentName }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to delete agent");
        return;
      }
      setShowModal(false);
      router.refresh();
    } catch {
      setError("Failed to delete agent. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setShowModal(true); }}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.18)",
          color: "#EF4444",
        }}
      >
        Delete agent
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setShowModal(false); setError(null); } }}
        >
          <div
            className="w-full max-w-md space-y-5 rounded-2xl p-6"
            style={{ background: "var(--card)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 40px rgba(0,0,0,0.4)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: "rgba(239,68,68,0.10)" }}
            >
              🗑️
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Delete {agentName}?</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                This will permanently delete this agent and its configuration. Your{" "}
                <span className="text-white font-medium">call history will be preserved</span>.
                This action cannot be undone.
              </p>
            </div>

            {error && (
              <p
                className="rounded-lg px-3 py-2 text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setError(null); }}
                disabled={deleting}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "#EF4444" }}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
