"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/agents", label: "Agents", icon: "◎" },
  { href: "/wizard", label: "Setup Wizard", icon: "✦" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#222222] bg-[#0a0a0a]">
        <div className="flex h-16 items-center border-b border-[#222222] px-6">
          <Logo href="/dashboard" size="sm" />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        <div className="border-t border-[#222222] p-4">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-300"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#222222] bg-[#0a0a0a]">
        {navItems.map((item) => {
          const active = pathname === item.href;
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
      </nav>
    </>
  );
}
