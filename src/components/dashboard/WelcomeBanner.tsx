"use client";

import { Card } from "@/components/ui/Card";
import { useProfile } from "@/hooks/useProfile";
import { getFirstName, getInitials } from "@/lib/types/profile";

export function WelcomeBanner() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <Card padding="md" className="animate-pulse">
        <div className="h-6 w-48 rounded bg-[#222222]" />
        <div className="mt-2 h-4 w-64 rounded bg-[#222222]" />
      </Card>
    );
  }

  if (!profile) return null;

  const firstName = getFirstName(profile.full_name);
  const initials = getInitials(profile.full_name);

  return (
    <Card
      padding="md"
      className="border-[#f97316]/20 bg-gradient-to-r from-[#111111] via-[#0a0a0a] to-[#1a1008]"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 text-lg font-bold text-[#f97316]"
          aria-hidden
        >
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Welcome back, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            @{profile.username} · Here&apos;s what your AI agents have been up to
          </p>
        </div>
      </div>
    </Card>
  );
}
