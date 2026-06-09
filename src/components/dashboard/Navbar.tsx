"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { getFirstName, getInitials } from "@/lib/types/profile";
import type { User } from "@supabase/supabase-js";

interface DashboardNavbarProps {
  title: string;
  subtitle?: string;
}

export function DashboardNavbar({ title, subtitle }: DashboardNavbarProps) {
  const { profile, loading: profileLoading } = useProfile();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  function clearAuthCookies() {
    const cookieNames = document.cookie
      .split(";")
      .map((c) => c.split("=")[0]?.trim())
      .filter(Boolean);
    for (const name of cookieNames) {
      if (!name.startsWith("sb-")) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    clearAuthCookies();
    window.location.href = "/login";
  }

  const displayName = profile
    ? getFirstName(profile.full_name)
    : user?.email?.split("@")[0] ?? "there";
  const initials = profile
    ? getInitials(profile.full_name)
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "?";

  return (
    <header
      className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
      style={{
        background: "rgba(20, 20, 20, 0.8)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Title block */}
      <div className="min-w-0">
        <h1
          className="truncate text-lg font-semibold text-white sm:text-xl"
          style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-white/40 sm:text-sm">{subtitle}</p>
        )}
        {!profileLoading && profile && (
          <p className="mt-0.5 text-xs text-[#E87B2C] sm:hidden">
            Hi, {displayName}
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-3">
        {!profileLoading && (profile || user) && (
          <div className="flex items-center gap-3">
            {/* Name + username (desktop) */}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white/90" style={{ fontFamily: "Outfit, sans-serif" }}>
                {profile?.full_name ?? user?.email}
              </p>
              <p className="text-xs text-white/35">
                {profile ? `@${profile.username}` : user?.email}
              </p>
            </div>

            {/* Avatar */}
            <div
              className="flex h-9 w-9 cursor-default items-center justify-center rounded-full text-sm font-bold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
                boxShadow: "0 0 0 2px rgba(232, 123, 44, 0.2), 0 4px 12px rgba(232, 123, 44, 0.25)",
                fontFamily: "Outfit, sans-serif",
              }}
              title={profile?.full_name ?? user?.email ?? "Account"}
            >
              {initials}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/40 transition-all duration-200 hover:text-white/80"
          style={{ fontFamily: "Outfit, sans-serif" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
