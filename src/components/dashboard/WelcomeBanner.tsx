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
      className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, #1e1e1e 0%, #1f1508 50%, #1e1e1e 100%)",
        border: "1px solid rgba(232, 123, 44, 0.2)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: "linear-gradient(90deg, #E87B2C, #f59e0b, transparent)" }}
      />
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-[0.08]"
        style={{ background: "radial-gradient(circle, rgba(232,123,44,0.8) 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
            boxShadow: "0 0 20px rgba(232, 123, 44, 0.35)",
            fontFamily: "Outfit, sans-serif",
          }}
          aria-hidden
        >
          {initials}
        </div>
        <div>
          <h2 className="font-[Outfit] text-xl font-bold text-white sm:text-2xl">
            Welcome back, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-[#AAAAAA]">
            @{profile.username} · Here&apos;s what your AI agents have been up to
          </p>
        </div>
      </div>
    </div>
  );
}
