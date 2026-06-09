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
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#222222] bg-[#0a0a0a]">
        <div className="flex h-16 items-center gap-3 border-b border-[#222222] px-6">
          <Logo href="/admin" size="sm" />
        </div>

        <div className="px-4 py-3">
          <span className="rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-semibold text-[#f97316]">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#f97316]/10 text-[#f97316]"
                    : "text-gray-400 hover:bg-[#111111] hover:text-white",
                ].join(" ")}
              >
                <span className="text-base opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-[#222222] p-4">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-300"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#222222] bg-[#0a0a0a]">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium",
                active ? "text-[#f97316]" : "text-gray-500",
              ].join(" ")}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium text-gray-500"
        >
          <span>←</span>
          App
        </Link>
      </nav>
    </>
  );
}
