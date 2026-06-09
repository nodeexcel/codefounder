"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Wand2,
  CreditCard,
  Settings2,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase";
import { useSidebar } from "./SidebarContext";
import type { LucideIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/wizard", label: "Setup Wizard", icon: Wand2 },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function SidebarLink({
  item,
  isCollapsed,
  active,
}: {
  item: NavItem;
  isCollapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="relative group/nav">
      <Link
        href={item.href}
        className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden"
        style={
          active
            ? { background: "rgba(232, 123, 44, 0.1)", color: "#E87B2C" }
            : { color: "rgba(180, 180, 180, 0.9)" }
        }
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.color = "#ffffff";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "rgba(180, 180, 180, 0.9)";
          }
        }}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: "#E87B2C", boxShadow: "0 0 8px rgba(232, 123, 44, 0.7)" }}
          />
        )}
        <Icon
          size={17}
          strokeWidth={active ? 2.2 : 1.8}
          className="shrink-0"
          style={{ color: active ? "#E87B2C" : undefined }}
        />
        <span
          className="whitespace-nowrap font-[Outfit] tracking-wide overflow-hidden"
          style={{
            opacity: isCollapsed ? 0 : 1,
            maxWidth: isCollapsed ? 0 : 160,
            transition: "opacity 200ms, max-width 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {item.label}
        </span>
      </Link>

      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
          <div
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
            style={{
              background: "#1e1e1e",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {item.label}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  const adminActive = pathname.startsWith("/admin");

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30"
        style={{
          width: isCollapsed ? 60 : 240,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          background: "linear-gradient(180deg, #141414 0%, #111111 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingLeft: 14,
            paddingRight: 14,
          }}
        >
          {isCollapsed ? (
            <Link href="/dashboard">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
                  boxShadow: "0 2px 8px rgba(232, 123, 44, 0.35)",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                C
              </span>
            </Link>
          ) : (
            <Logo href="/dashboard" size="sm" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              active={isActive(item)}
            />
          ))}

          <div
            className="my-2 mx-1"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />

          {SECONDARY_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              active={isActive(item)}
            />
          ))}

          {isAdmin && (
            <div className="relative group/nav">
              <Link
                href="/admin"
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden"
                style={
                  adminActive
                    ? { background: "rgba(232, 123, 44, 0.15)", color: "#E87B2C" }
                    : { background: "rgba(232, 123, 44, 0.05)", color: "#E87B2C" }
                }
              >
                <ShieldCheck size={17} strokeWidth={1.8} className="shrink-0" />
                <span
                  className="whitespace-nowrap font-[Outfit] overflow-hidden"
                  style={{
                    opacity: isCollapsed ? 0 : 1,
                    maxWidth: isCollapsed ? 0 : 160,
                    transition: "opacity 200ms, max-width 300ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  Admin Panel
                </span>
              </Link>
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                  <div
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
                    style={{
                      background: "#1e1e1e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                  >
                    Admin Panel
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div
          className="shrink-0 p-2 space-y-0.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {user && (
            <div
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #E87B2C 0%, #f59e0b 100%)",
                  boxShadow: "0 2px 6px rgba(232, 123, 44, 0.3)",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {initials}
              </div>
              <div
                className="min-w-0 flex-1 overflow-hidden"
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  maxWidth: isCollapsed ? 0 : 180,
                  transition: "opacity 200ms, max-width 300ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <p className="truncate text-[11px] font-medium text-white/80 font-[Outfit]">
                  {displayEmail}
                </p>
                <p className="text-[10px] text-white/30">Signed in</p>
              </div>
            </div>
          )}

          <div className="relative group/signout">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 transition-all duration-200 hover:text-white/70 hover:bg-white/[0.04] overflow-hidden"
            >
              <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
              <span
                className="whitespace-nowrap font-[Outfit] overflow-hidden"
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  maxWidth: isCollapsed ? 0 : 160,
                  transition: "opacity 200ms, max-width 300ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                Sign out
              </span>
            </button>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/signout:opacity-100 transition-opacity duration-150">
                <div
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
                  style={{
                    background: "#1e1e1e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  }}
                >
                  Sign out
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/25 transition-all duration-200 hover:text-white/55 hover:bg-white/[0.03]"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={2} className="mx-auto" />
            ) : (
              <>
                <ChevronLeft size={14} strokeWidth={2} className="shrink-0" />
                <span
                  className="text-xs font-[Outfit] overflow-hidden whitespace-nowrap"
                  style={{
                    opacity: isCollapsed ? 0 : 1,
                    maxWidth: isCollapsed ? 0 : 160,
                    transition: "opacity 200ms, max-width 300ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  Collapse
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "rgba(14, 14, 14, 0.97)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {[...PRIMARY_NAV, ...SECONDARY_NAV].slice(0, isAdmin ? 4 : 5).map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[9px] font-medium transition-all duration-200"
              style={{ color: active ? "#E87B2C" : "rgba(120, 120, 120, 1)" }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.6}
                style={
                  active
                    ? { filter: "drop-shadow(0 0 4px rgba(232, 123, 44, 0.6))" }
                    : undefined
                }
              />
              <span className="font-[Outfit]">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[9px] font-medium"
            style={{ color: "#E87B2C" }}
          >
            <ShieldCheck size={18} strokeWidth={1.6} />
            <span className="font-[Outfit]">Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
