"use client";

import Script from "next/script";
import { useEffect } from "react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { LogoStrip } from "./LogoStrip";
import { Services } from "./Services";
import { Process } from "./Process";
import { Stats } from "./Stats";
import { About } from "./About";
import { BeforeAfter } from "./BeforeAfter";
import { Industries } from "./Industries";
import { Projects } from "./Projects";
import { CTA } from "./CTA";
import { Contact } from "./Contact";
import { FAQ } from "./FAQ";
import { Footer } from "./Footer";
import { RevealObserver } from "./RevealObserver";

declare global {
  interface Window {
    VG_CONFIG?: Record<string, unknown>;
    gsap?: { registerPlugin: (...args: unknown[]) => void; to: (target: string, opts: Record<string, unknown>) => void };
    ScrollTrigger?: unknown;
  }
}

export function LandingPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.convocore.ai/vg_live_build/vg_bundle.js";
    script.defer = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  useEffect(() => {
    function tryGsap() {
      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.gsap.to(".newui-landing .hero-grid", {
          yPercent: 20,
          ease: "none",
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          } as Record<string, unknown>,
        });
      }
    }
    tryGsap();
    const t = setTimeout(tryGsap, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="newui-landing">
      <Script id="convocore-config" strategy="beforeInteractive">{`
        window.VG_CONFIG = {
          ID: "bKqzbs18mTYYgW4klVwa",
          region: 'na',
          render: 'bottom-right',
          stylesheets: ["https://cdn.convocore.ai/vg_live_build/styles.css"],
        };
      `}</Script>

      <RevealObserver />
      <Navbar />
      <Hero />
      <LogoStrip />
      <Services />
      <Process />
      <Stats />
      <About />
      <BeforeAfter />
      <Industries />
      <Projects />
      <CTA />
      <Contact />
      <FAQ />
      <Footer />
    </div>
  );
}
