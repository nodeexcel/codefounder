"use client";

import { useEffect, useRef } from "react";

interface VantaEffect {
  destroy(): void;
}

export function VantaBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef    = useRef<VantaEffect | null>(null);

  useEffect(() => {
    // Guard: already initialised or no mount target yet
    if (effectRef.current || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic imports keep Three.js + Vanta out of the initial bundle.
        // Both resolve to npm packages — no CDN URLs, no script injection.
        const THREE = await import("three");

        // vanta ships no TypeScript declarations
        // @ts-ignore
        const { default: CELLS } = await import("vanta/dist/vanta.cells.min");

        if (cancelled || !containerRef.current) return;

        effectRef.current = CELLS({
          el:            containerRef.current,
          THREE,           // pass the module namespace so Vanta uses this instance
          mouseControls: true,
          touchControls: true,
          gyroControls:  false,
          minHeight:     200,
          minWidth:      200,
          scale:         1.00,
          color1:        0x000000,
          color2:        0x4a0303,
          size:          3.90,
          speed:         1.40,
        }) as VantaEffect;
      } catch {
        // Purely decorative — page works normally if Vanta fails to initialise
      }
    })();

    return () => {
      cancelled = true;
      // Vanta's destroy() tears down the WebGL context and all event listeners
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  return (
    <>
      {/* Vanta WebGL canvas target */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        0,
          pointerEvents: "none",
        }}
      />
      {/* Scrim so any content rendered above stays readable */}
      <div
        aria-hidden="true"
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        0,
          pointerEvents: "none",
          background:    "rgba(0,0,0,0.54)",
        }}
      />
    </>
  );
}
