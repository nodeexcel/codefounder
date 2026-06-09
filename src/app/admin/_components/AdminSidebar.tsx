"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/admin", label: "Overview", icon: "◉", exact: true },
  { href: "/admin/users", label: "Users", icon: "◎" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0"
        style={{
          background: "linear-gradient(180deg, #141414 0%, #111111 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex h-16 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Logo href="/admin" size="sm" />
        </div>

        <div className="px-4 pt-4 pb-1">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-[Outfit]"
            style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
          >
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 font-[Outfit]"
                style={
                  active
                    ? { background: "rgba(232, 123, 44, 0.1)", color: "#E87B2C" }
                    : { color: "rgba(180,180,180,0.9)" }
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
                    (e.currentTarget as HTMLElement).style.color = "rgba(180,180,180,0.9)";
                  }
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 font-[Outfit]"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)";
              (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "rgba(14, 14, 14, 0.97)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium font-[Outfit]"
              style={{ color: active ? "#E87B2C" : "rgba(120,120,120,1)" }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-medium font-[Outfit]"
          style={{ color: "rgba(120,120,120,1)" }}
        >
          <span>←</span>
          App
        </Link>
      </nav>
    </>
  );
}
