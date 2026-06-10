"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The inline script in layout.tsx handles the initial flash-free apply.
    // This effect syncs React mount with whatever the inline script set.
    const stored = localStorage.getItem("cf-theme");
    const current = document.documentElement.getAttribute("data-theme");
    if (stored && stored !== current) {
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  return <>{children}</>;
}
