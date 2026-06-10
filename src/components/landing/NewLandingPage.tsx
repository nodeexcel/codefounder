"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    gsap?: {
      registerPlugin: (...args: unknown[]) => void;
      to: (target: string, opts: Record<string, unknown>) => void;
    };
    ScrollTrigger?: unknown;
  }
}

function initLandingInteractions() {
  // Theme toggle
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const cur = root.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("cf-theme", next);
    });
  }

  // Hero rotating headline
  const phrases = [
    "Automate Phone Calls",
    "Grows Your Business",
    "Works While You Sleep",
    "Book Appointments",
    "Answer Every Call",
  ];
  const heroRotate = document.getElementById("heroRotate");
  let rotateIdx = 0;
  let rotateTimer: ReturnType<typeof setInterval> | null = null;
  if (heroRotate) {
    rotateTimer = setInterval(() => {
      heroRotate.classList.add("switching");
      setTimeout(() => {
        rotateIdx = (rotateIdx + 1) % phrases.length;
        heroRotate.textContent = phrases[rotateIdx];
        heroRotate.classList.remove("switching");
      }, 400);
    }, 2400);
  }

  // Nav scroll state
  const navbar = document.getElementById("navbar");
  const onNavScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 30) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onNavScroll);
  onNavScroll();

  // Mobile menu
  const mobileToggle = document.getElementById("mobileToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const closeMob = () => mobileMenu?.classList.remove("open");
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener("click", () =>
      mobileMenu.classList.toggle("open")
    );
    mobileMenu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", closeMob)
    );
  }

  // Reveal on scroll via IntersectionObserver
  const revealEls = document.querySelectorAll(".newui-landing .reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // FAQ accordion
  document
    .querySelectorAll(".newui-landing .faq-q")
    .forEach((q) => {
      q.addEventListener("click", () => {
        const item = q.parentElement;
        if (!item) return;
        const wasOpen = item.classList.contains("open");
        document
          .querySelectorAll(".newui-landing .faq-item")
          .forEach((i) => i.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      });
    });

  // Contact form
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = document.getElementById("successMsg");
      if (msg) msg.classList.add("show");
      (contactForm as HTMLFormElement).reset();
    });
  }

  // Modals
  const openModal = (id: string) =>
    document.getElementById(id)?.classList.add("open");
  const closeModal = (id: string) =>
    document.getElementById(id)?.classList.remove("open");

  document.getElementById("closePrivacy")?.addEventListener("click", () =>
    closeModal("privacyModal")
  );
  document.getElementById("closeTerms")?.addEventListener("click", () =>
    closeModal("termsModal")
  );
  document
    .querySelectorAll(".newui-landing .modal")
    .forEach((m) => {
      m.addEventListener("click", (e) => {
        if (e.target === m) (m as HTMLElement).classList.remove("open");
      });
    });

  // Footer privacy/terms links (in case HTML uses openModal calls)
  document.querySelectorAll(".newui-landing .ft-legal a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === "/privacy") {
      a.addEventListener("click", (e) => {
        if (href === "/privacy") return; // let normal navigation happen
      });
    }
  });

  // Footer year
  const yearEl = document.getElementById("yearNow");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Escape key closes modals
  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal("privacyModal");
      closeModal("termsModal");
      closeMob();
    }
  };
  document.addEventListener("keydown", onEscape);

  // GSAP parallax (hero grid)
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
  // GSAP loads async — try now, and again after a short delay
  tryGsap();
  const gsapTimer = setTimeout(tryGsap, 1500);

  // Suppress unused warning
  void openModal;

  return () => {
    window.removeEventListener("scroll", onNavScroll);
    document.removeEventListener("keydown", onEscape);
    io.disconnect();
    if (rotateTimer) clearInterval(rotateTimer);
    clearTimeout(gsapTimer);
  };
}

type NewLandingPageProps = {
  html: string;
};

export function NewLandingPage({ html }: NewLandingPageProps) {
  useEffect(() => {
    return initLandingInteractions();
  }, []);

  useEffect(() => {
    const vgScript = document.createElement("script");
    vgScript.src = "https://cdn.convocore.ai/vg_live_build/vg_bundle.js";
    vgScript.defer = true;
    document.body.appendChild(vgScript);
    return () => {
      vgScript.remove();
    };
  }, []);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script id="convocore-config" strategy="beforeInteractive">
        {`
          window.VG_CONFIG = {
            ID: "bKqzbs18mTYYgW4klVwa",
            region: 'na',
            render: 'bottom-right',
            stylesheets: [
              "https://cdn.convocore.ai/vg_live_build/styles.css",
            ],
          };
        `}
      </Script>
    </>
  );
}
