"use client";

import { useState } from "react";

interface Props {
  limitReached: boolean;
  planKey: string;
  agentLimit: number;
  currentCount: number;
}

export function NewAgentButton({ limitReached, planKey, agentLimit, currentCount }: Props) {
  const [showModal, setShowModal] = useState(false);

  const btnClass =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110";
  const btnStyle = { background: "var(--accent)", color: "#fff" };

  if (!limitReached) {
    return (
      <a href="/wizard?new=true" className={btnClass} style={btnStyle}>
        + New agent
      </a>
    );
  }

  const planLabel = planKey.charAt(0).toUpperCase() + planKey.slice(1);

  return (
    <>
      <button type="button" onClick={() => setShowModal(true)} className={btnClass} style={btnStyle}>
        + New agent
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl p-6"
            style={{ background: "var(--card)", border: "1px solid rgba(232,123,44,0.3)", boxShadow: "0 0 40px rgba(0,0,0,0.4)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: "rgba(232,123,44,0.12)" }}
            >
              🚀
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Agent limit reached</h3>
              <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                Your <span className="text-white font-medium">{planLabel}</span> plan allows{" "}
                <span className="text-white font-medium">{agentLimit} active agent{agentLimit !== 1 ? "s" : ""}</span>.
                You currently have {currentCount} active. Upgrade to create more.
              </p>
            </div>

            <div
              className="grid grid-cols-2 gap-3 rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Current plan</p>
                <p className="mt-0.5 text-sm font-semibold text-white capitalize">{planKey}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Agent limit</p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: "#E87B2C" }}>
                  {agentLimit >= 999 ? "Unlimited" : agentLimit}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 rounded-lg py-2.5 text-center text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "#E87B2C" }}
              >
                Upgrade to Pro →
              </a>
              <a
                href="/billing"
                className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                View Plans
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full text-center text-xs transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
