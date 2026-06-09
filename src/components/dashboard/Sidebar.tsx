"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/agents",
    label: "Agents",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M18 8h2m-2 4h2M4 8h2m-2 4h2" />
      </svg>
    ),
  },
  {
    href: "/calls",
    label: "Calls",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
      </svg>
    ),
  },
  {
    href: "/wizard",
    label: "Setup Wizard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/billing",
    label: "Billing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        setIsAdmin(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "admin") setIsAdmin(true);
    }
    init();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    const cookieNames = document.cookie
      .split(";")
      .map((c) => c.split("=")[0]?.trim())
      .filter(Boolean);
    for (const name of cookieNames) {
      if (!name.startsWith("sb-")) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    window.location.href = "/login";
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const displayEmail = user?.email ?? "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0"
        style={{
          background: "linear-gradient(180deg, #171717 0%, #141414 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="transition-all duration-300 hover:opacity-80 hover:scale-[1.03]">
            <Logo href="/dashboard" size="sm" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group"
                style={
                  active
                    ? {
                        background: "rgba(232, 123, 44, 0.1)",
                        color: "#E87B2C",
                        boxShadow: "inset 0 0 24px rgba(232, 123, 44, 0.04)",
                      }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(232, 123, 44, 0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.color = "";
                  }
                }}
              >
                {/* Active left border */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{
                      background: "#E87B2C",
                      boxShadow: "0 0 10px rgba(232, 123, 44, 0.7)",
                    }}
                  />
                )}
                <span
                  className="transition-transform duration-200"
                  style={{ color: active ? "#E87B2C" : "rgba(160,160,160,1)" }}
                >
                  {item.icon}
                </span>
                <span
                  className="font-[Outfit] tracking-wide"
                  style={{ color: active ? "#E87B2C" : "rgba(160,160,160,1)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
              style={
                pathname.startsWith("/admin")
                  ? { background: "rgba(232, 123, 44, 0.15)", color: "#E87B2C" }
                  : { background: "rgba(232, 123, 44, 0.05)", color: "#E87B2C" }
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="font-[Outfit]">Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* User info + signout */}
        <div
          className="p-3 space-y-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {user && (
            <div
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
                  boxShadow: "0 2px 8px rgba(232, 123, 44, 0.35)",
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/80 font-[Outfit]">
                  {displayEmail}
                </p>
                <p className="text-[10px] text-white/30">Signed in</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 transition-all duration-200 hover:text-white/70 hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="font-[Outfit]">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "rgba(20,20,20,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all duration-200"
              style={{ color: active ? "#E87B2C" : "rgba(120,120,120,1)" }}
            >
              <span
                style={
                  active
                    ? { filter: "drop-shadow(0 0 5px rgba(232, 123, 44, 0.6))" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium"
            style={{ color: "#E87B2C" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin
          </Link>
        )}
      </nav>
    </>
  );
}
