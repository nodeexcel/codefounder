"use client";

import { useSidebar } from "./SidebarContext";

export function ContentShift({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <>
      {/* Desktop: shift content right based on sidebar width */}
      <div
        className="hidden lg:block transition-[padding-left] duration-300 ease-in-out"
        style={{ paddingLeft: isCollapsed ? 60 : 240 }}
      >
        {children}
      </div>
      {/* Mobile: no left padding, just add bottom spacer for bottom nav */}
      <div className="lg:hidden">
        {children}
        <div className="h-16" aria-hidden />
      </div>
    </>
  );
}
