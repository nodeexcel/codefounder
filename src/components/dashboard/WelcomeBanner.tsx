"use client";

import { useProfile } from "@/hooks/useProfile";
import { getFirstName, getInitials } from "@/lib/types/profile";

export function WelcomeBanner() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl shrink-0" style={{ background: "var(--surface2)" }} />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded-md" style={{ background: "var(--surface2)" }} />
            <div className="h-3.5 w-56 rounded-md" style={{ background: "var(--surface2)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const firstName = getFirstName(profile.full_name);
  const initials  = getInitials(profile.full_name);

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4"
      style={{ background: "transparent" }}
    >
      {/* Top accent line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{ background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 30%, transparent 70%)", opacity: 0.6 }}
      />
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,122,26,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative flex items-center gap-3.5">
        {/* Avatar */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
            boxShadow: "0 4px 12px rgba(255,122,26,0.30)",
            fontFamily: "var(--font-heading)",
          }}
          aria-hidden
        >
          {initials}
        </div>

        <div className="min-w-0">
          <h2
            className="text-[17px] font-bold leading-snug"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em", color: "var(--foreground)" }}
          >
            Welcome back,{" "}
            <span style={{ fontFamily: "var(--font-cursive)", color: "var(--accent)", fontWeight: 600 }}>{firstName}</span>
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            @{profile.username} · Your AI agents are ready
          </p>
        </div>

        {/* Live indicator */}
        <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "var(--success-bg)", border: "1px solid rgba(16,185,129,0.20)" }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--success)", fontFamily: "var(--font-sans)" }}>System live</span>
        </div>
      </div>
    </div>
  );
}
