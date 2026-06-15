"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, Phone, Wand2, CreditCard,
  Settings2, ShieldCheck, LogOut, PanelLeftClose, PanelLeftOpen, BarChart2, Smartphone, X,
} from "lucide-react";
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
  { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/agents",     label: "Agents",        icon: Bot },
  { href: "/calls",      label: "Calls",         icon: Phone },
  { href: "/analytics",     label: "Analytics",      icon: BarChart2 },
  { href: "/phone-numbers", label: "Phone Numbers",  icon: Smartphone },
  { href: "/wizard",     label: "Setup Wizard",  icon: Wand2 },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/billing",  label: "Billing",  icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function NavLink({ item, isCollapsed, active, onNavClick }: { item: NavItem; isCollapsed: boolean; active: boolean; onNavClick?: () => void }) {
  const Icon = item.icon;

  return (
    <div className="relative group/nav">
      <Link
        href={item.href}
        onClick={onNavClick}
        className="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150 overflow-hidden"
        style={active
          ? { background: "rgba(255,122,26,0.10)", color: "var(--accent)" }
          : { color: "var(--muted)" }
        }
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          }
        }}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 8px rgba(255,122,26,0.6)" }}
          />
        )}
        <Icon
          size={16}
          strokeWidth={active ? 2.2 : 1.8}
          className="shrink-0 ml-0.5"
          style={{ color: active ? "var(--accent)" : undefined }}
        />
        <span
          className="sidebar-label whitespace-nowrap overflow-hidden"
          style={{
            fontFamily: "var(--font-sans)",
            opacity: isCollapsed ? 0 : 1,
            maxWidth: isCollapsed ? 0 : 160,
            transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {item.label}
        </span>
      </Link>

      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
          <div
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{
              background: "var(--tooltip-bg)",
              border: "1px solid var(--border2)",
              boxShadow: "var(--shadow-md)",
              color: "var(--foreground)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {item.label}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  isCollapsed,
  isAdmin,
  user,
  initials,
  displayEmail,
  isActive,
  adminActive,
  handleSignOut,
  toggle,
  onNavClick,
  showCollapseBtn = true,
}: {
  isCollapsed: boolean;
  isAdmin: boolean;
  user: User | null;
  initials: string;
  displayEmail: string;
  isActive: (item: NavItem) => boolean;
  adminActive: boolean;
  handleSignOut: () => void;
  toggle: () => void;
  onNavClick?: () => void;
  showCollapseBtn?: boolean;
}) {
  return (
    <>
      {/* Logo */}
      <div
        className="flex h-[60px] items-center shrink-0 px-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {isCollapsed ? (
          <Link href="/dashboard" aria-label="Dashboard">
            <Image src="/Brandmark.png" alt="CodeFounder" width={28} height={28} className="object-contain" priority />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Dashboard" onClick={onNavClick}>
            <Image src="/Brandmark.png" alt="" width={28} height={28} className="object-contain shrink-0" priority />
            <span
              className="sidebar-label font-bold text-[17px] tracking-tight whitespace-nowrap"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                letterSpacing: "-0.025em",
                color: "var(--foreground)",
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 200,
                overflow: "hidden",
                transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              Code<span style={{ color: "var(--accent)" }}>Founder</span>
            </span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} isCollapsed={isCollapsed} active={isActive(item)} onNavClick={onNavClick} />
        ))}

        <div className="my-2 mx-1" style={{ height: "1px", background: "var(--border)" }} />

        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} isCollapsed={isCollapsed} active={isActive(item)} onNavClick={onNavClick} />
        ))}

        {isAdmin && (
          <div className="relative group/nav">
            <Link
              href="/admin"
              onClick={onNavClick}
              className="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150"
              style={adminActive
                ? { background: "rgba(255,122,26,0.12)", color: "var(--accent)" }
                : { background: "rgba(255,122,26,0.04)", color: "var(--accent)" }
              }
            >
              <ShieldCheck size={16} strokeWidth={1.8} className="shrink-0 ml-0.5" />
              <span
                className="sidebar-label whitespace-nowrap overflow-hidden"
                style={{
                  fontFamily: "var(--font-sans)",
                  opacity: isCollapsed ? 0 : 1,
                  maxWidth: isCollapsed ? 0 : 160,
                  transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                Admin Panel
              </span>
            </Link>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                <div className="rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap" style={{ background: "var(--tooltip-bg)", border: "1px solid var(--border2)", boxShadow: "var(--shadow-md)", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
                  Admin Panel
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-2 py-2 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        {user && (
          <div
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 overflow-hidden"
            style={{ background: "var(--surface)" }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)",
                boxShadow: "0 2px 6px rgba(255,122,26,0.3)",
                fontFamily: "var(--font-heading)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div
              className="sidebar-label min-w-0 flex-1 overflow-hidden"
              style={{
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 180,
                transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <p className="truncate text-[11px] font-medium" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                {displayEmail}
              </p>
              <p className="text-[10px]" style={{ color: "var(--muted-low)" }}>Signed in</p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="relative group/signout">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-all duration-150 overflow-hidden"
            style={{ color: "var(--muted-low)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
              (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "var(--muted-low)";
            }}
          >
            <LogOut size={15} strokeWidth={1.8} className="shrink-0 ml-0.5" />
            <span
              className="sidebar-label whitespace-nowrap overflow-hidden"
              style={{
                fontFamily: "var(--font-sans)",
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 160,
                transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              Sign out
            </span>
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 group-hover/signout:opacity-100 transition-opacity duration-150">
              <div className="rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap" style={{ background: "var(--tooltip-bg)", border: "1px solid var(--border2)", boxShadow: "var(--shadow-md)", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
                Sign out
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        {showCollapseBtn && (
          <button
            onClick={toggle}
            className="sidebar-collapse-btn w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-all duration-150"
            style={{ color: "var(--muted-low)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "var(--muted-low)";
            }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={14} strokeWidth={2} className="mx-auto" />
            ) : (
              <>
                <PanelLeftClose size={14} strokeWidth={2} className="shrink-0 ml-0.5" />
                <span
                  className="sidebar-label text-xs overflow-hidden whitespace-nowrap"
                  style={{
                    fontFamily: "var(--font-sans)",
                    opacity: isCollapsed ? 0 : 1,
                    maxWidth: isCollapsed ? 0 : 160,
                    transition: "opacity 180ms, max-width 280ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  Collapse
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) { setIsAdmin(true); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin") setIsAdmin(true);
    }
    init();
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    const cookieNames = document.cookie.split(";").map((c) => c.split("=")[0]?.trim()).filter(Boolean);
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

  const sharedProps = {
    isAdmin,
    user,
    initials,
    displayEmail,
    isActive,
    adminActive,
    handleSignOut,
    toggle,
  };

  return (
    <>
      <style>{`
        /* Tablet: force sidebar to icon-only (58px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .sidebar-desktop {
            width: 58px !important;
            overflow: hidden !important;
          }
          .sidebar-desktop .sidebar-label {
            opacity: 0 !important;
            max-width: 0 !important;
            overflow: hidden !important;
            pointer-events: none;
          }
          .sidebar-desktop .sidebar-collapse-btn {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer (< md) ────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: 260,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--border)",
          boxShadow: mobileOpen ? "var(--shadow-md)" : "none",
        }}
      >
        {/* Drawer header with close button */}
        <div
          className="flex h-[60px] items-center justify-between shrink-0 px-3.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <Image src="/Brandmark.png" alt="" width={28} height={28} className="object-contain shrink-0" priority />
            <span
              className="font-bold text-[17px] tracking-tight"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                letterSpacing: "-0.025em",
                color: "var(--foreground)",
              }}
            >
              Code<span style={{ color: "var(--accent)" }}>Founder</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--muted)", background: "var(--surface)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isCollapsed={false}
              active={isActive(item)}
              onNavClick={() => setMobileOpen(false)}
            />
          ))}
          <div className="my-2 mx-1" style={{ height: "1px", background: "var(--border)" }} />
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isCollapsed={false}
              active={isActive(item)}
              onNavClick={() => setMobileOpen(false)}
            />
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium"
              style={adminActive
                ? { background: "rgba(255,122,26,0.12)", color: "var(--accent)" }
                : { background: "rgba(255,122,26,0.04)", color: "var(--accent)" }
              }
            >
              <ShieldCheck size={16} strokeWidth={1.8} className="shrink-0 ml-0.5" />
              <span style={{ fontFamily: "var(--font-sans)" }}>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-2 py-2 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
          {user && (
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: "var(--surface)" }}>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)", boxShadow: "0 2px 6px rgba(255,122,26,0.3)", fontFamily: "var(--font-heading)" }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>{displayEmail}</p>
                <p className="text-[10px]" style={{ color: "var(--muted-low)" }}>Signed in</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-all duration-150 min-h-[44px]"
            style={{ color: "var(--muted-low)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
              (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "var(--muted-low)";
            }}
          >
            <LogOut size={15} strokeWidth={1.8} className="shrink-0 ml-0.5" />
            <span style={{ fontFamily: "var(--font-sans)" }}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop / tablet sidebar (md+) ──────────────────────── */}
      <aside
        className="sidebar-desktop hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30"
        style={{
          width: isCollapsed ? 58 : 232,
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <SidebarContent
          {...sharedProps}
          isCollapsed={isCollapsed}
        />
      </aside>

      {/* ── Mobile bottom nav (< md only) ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "var(--nav-bg)",
          borderTop: "1px solid var(--border)",
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
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-medium transition-all duration-150 min-h-[44px] justify-center"
              style={{ color: active ? "var(--accent)" : "var(--muted-low)", fontFamily: "var(--font-sans)" }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.6}
                style={active ? { filter: "drop-shadow(0 0 4px rgba(255,122,26,0.5))" } : undefined}
              />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-medium min-h-[44px] justify-center"
            style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}
          >
            <ShieldCheck size={18} strokeWidth={1.6} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
