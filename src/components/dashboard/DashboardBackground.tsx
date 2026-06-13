"use client";

import { useEffect } from "react";

export function DashboardBackground() {
  useEffect(() => {
    // Set the attribute on <html> (documentElement), NOT body.
    // The CSS rule `html[data-dashboard-bg]` paints the background image
    // as the CSS canvas background — the absolute lowest rendering layer,
    // impossible for any child element, z-index, or stacking context to cover.
    document.documentElement.setAttribute("data-dashboard-bg", "");
    return () => document.documentElement.removeAttribute("data-dashboard-bg");
  }, []);

  // Render only the dark overlay. The image itself is handled by CSS on <html>.
  return (
    <div
      aria-hidden
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        1,
        background:    "rgba(0,0,0,0.45)",
        pointerEvents: "none",
      }}
    />
  );
}
