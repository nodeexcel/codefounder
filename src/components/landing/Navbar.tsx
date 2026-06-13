"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("cf-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cf-theme", next);
  }

  return (
    <>
      <nav id="navbar" className={scrolled ? "scrolled" : undefined}>
        <Link href="#hero" className="nav-logo" aria-label="CodeFounder.ai">
          <span className="nav-bm-wrap">
            <Image src="/Brandmark.png" alt="CodeFounder logo" width={34} height={34} />
          </span>
          <span className="nav-logo-text">
            <span className="nav-logo-code">Code</span>
            <span className="nav-logo-founder">Founder</span>
          </span>
        </Link>

        <div className="nav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>

        <div className="nav-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={12} cy={12} r={5} /><line x1={12} y1={1} x2={12} y2={3} /><line x1={12} y1={21} x2={12} y2={23} />
              <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} /><line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
              <line x1={1} y1={12} x2={3} y2={12} /><line x1={21} y1={12} x2={23} y2={12} />
              <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} /><line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
            </svg>
            <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <Link href="/login" className="btn-outline">Sign In</Link>
          <Link href="/signup" className="btn-primary">Get Started →</Link>
          <button className="nav-mob" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1={3} y1={6} x2={21} y2={6} /><line x1={3} y1={12} x2={21} y2={12} /><line x1={3} y1={18} x2={21} y2={18} />
            </svg>
          </button>
        </div>
      </nav>

      <div className={`mob-menu${mobileOpen ? " open" : ""}`} id="mobileMenu">
        {NAV_LINKS.map(({ href, label }) => (
          <a key={href} href={href} onClick={() => setMobileOpen(false)}>{label}</a>
        ))}
        <Link href="/signup" className="btn-primary" style={{ textAlign: "center", marginTop: 8 }} onClick={() => setMobileOpen(false)}>
          Get Started →
        </Link>
      </div>
    </>
  );
}
