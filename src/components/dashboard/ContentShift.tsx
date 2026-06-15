"use client";

import { useSidebar } from "./SidebarContext";

export function ContentShift({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <>
      <style>{`
        /* Tablet (md–lg): sidebar is always icon-only (58px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .content-shift { padding-left: 58px !important; }
        }
      `}</style>

      {/* Desktop/tablet: shift content right of sidebar */}
      <div
        className="content-shift hidden md:block transition-[padding-left] duration-300 ease-in-out"
        style={{ paddingLeft: isCollapsed ? 60 : 240 }}
      >
        {children}
      </div>

      {/* Mobile: no left padding, add bottom spacer for bottom nav */}
      <div className="md:hidden">
        {children}
        <div className="h-16" aria-hidden />
      </div>
    </>
  );
}
