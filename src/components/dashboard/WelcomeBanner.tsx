"use client";

import { useProfile } from "@/hooks/useProfile";
import { getFirstName, getInitials } from "@/lib/types/profile";

export function WelcomeBanner() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div
        className="rounded-xl p-6 animate-pulse"
        style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-white/[0.06]" />
            <div className="h-4 w-64 rounded bg-white/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const firstName = getFirstName(profile.full_name);
  const initials = getInitials(profile.full_name);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl px-6 py-5 transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, #181410 0%, #1a1200 40%, #161614 100%)",
        border: "1px solid rgba(232, 123, 44, 0.18)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: "linear-gradient(90deg, transparent, #E87B2C 30%, #f59e0b 60%, transparent)" }}
      />
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #E87B2C 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-24 w-48 opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
            boxShadow: "0 0 24px rgba(232, 123, 44, 0.3)",
            fontFamily: "Outfit, sans-serif",
          }}
          aria-hidden
        >
          {initials}
        </div>
        <div>
          <h2
            className="font-[Outfit] text-lg font-bold text-white sm:text-xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Welcome back, {firstName}
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            @{profile.username} · Your AI agents are ready
          </p>
        </div>
      </div>
    </div>
  );
}
