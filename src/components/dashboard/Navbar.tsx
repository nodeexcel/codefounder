"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { getFirstName, getInitials } from "@/lib/types/profile";
import type { User } from "@supabase/supabase-js";

interface DashboardNavbarProps {
  title: string;
  subtitle?: string;
}

export function DashboardNavbar({ title, subtitle }: DashboardNavbarProps) {
  const { profile, loading: profileLoading } = useProfile();
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme();

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
      className="sticky top-0 z-40 flex min-h-[60px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-8"
      style={{
        background: "var(--nav-bg)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Title block */}
      <div className="min-w-0">
        <h1
          className="truncate text-base font-semibold sm:text-lg"
          style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "-0.015em", color: "var(--foreground)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs sm:text-sm" style={{ color: "var(--muted-low)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          }}
        >
          {theme === "dark" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {!profileLoading && (profile || user) && (
          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)", fontFamily: "Outfit, sans-serif", opacity: 0.85 }}
              >
                {displayName}
              </p>
              <p className="text-[11px]" style={{ color: "var(--muted-low)" }}>
                {profile ? `@${profile.username}` : user?.email}
              </p>
            </div>

            <div
              className="flex h-8 w-8 cursor-default items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)",
                boxShadow: "0 0 0 2px rgba(255,122,26,0.15), 0 2px 8px rgba(255,122,26,0.2)",
                fontFamily: "Outfit, sans-serif",
              }}
              title={profile?.full_name ?? user?.email ?? "Account"}
            >
              {initials}
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
          style={{ color: "var(--muted-low)", fontFamily: "Outfit, sans-serif" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "var(--muted-low)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
