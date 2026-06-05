"use client";

import Script from "next/script";
import { useEffect } from "react";

const CALENDLY_URL = "https://calendly.com/codefounder-info";

declare global {
  interface Window {
    toggleFaq?: (btn: HTMLButtonElement) => void;
    toggleCall?: () => void;
    seekCall?: (e: MouseEvent) => void;
    goToStep?: (idx: number) => void;
    nextStep?: () => void;
    prevStep?: () => void;
    openCalendly?: () => void;
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

function patchLandingHtml(html: string): string {
  return html
    .replace(
      '<a href="#" style="display:flex;align-items:center;gap:16px;text-decoration:none">',
      '<a href="/" style="display:flex;align-items:center;gap:16px;text-decoration:none">',
    )
    .replace(
      "</div>\n</nav>",
      `  <div style="display:flex;align-items:center;gap:12px;margin-left:16px;flex-shrink:0">
    <a href="/login" style="color:var(--gray-light);text-decoration:none;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap">Log in</a>
    <a href="/signup" class="nav-cta">Get Started</a>
  </div>
</nav>`,
    );
}

function initLandingInteractions() {
  // FAQ accordion
  window.toggleFaq = (btn: HTMLButtonElement) => {
    const answer = btn.nextElementSibling as HTMLElement | null;
    if (!answer) return;
    const isOpen = answer.classList.contains("open");
    document.querySelectorAll(".faq-a.open").forEach((el) => {
      el.classList.remove("open");
      const q = el.previousElementSibling;
      if (q) q.classList.remove("open");
    });
    if (!isOpen) {
      answer.classList.add("open");
      btn.classList.add("open");
    }
  };

  ["privacyModal", "termsModal"].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          (modal as HTMLElement).style.display = "none";
        }
      });
    }
  });

  const onEscape = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    ["privacyModal", "termsModal"].forEach((id) => {
      const m = document.getElementById(id);
      if (m) (m as HTMLElement).style.display = "none";
    });
    if (window.openCalendly) {
      const calOverlay = document.getElementById("calOverlay");
      if (calOverlay?.classList.contains("open")) {
        closeCalendly();
      }
    }
  };
  document.addEventListener("keydown", onEscape);

  const nav = document.querySelector("nav");
  const onNavScroll = () => {
    if (!nav) return;
    const el = nav as HTMLElement;
    if (window.scrollY > 60) {
      el.style.background = "rgba(20,20,20,0.95)";
      el.style.backdropFilter = "blur(20px)";
      el.style.borderBottomColor = "rgba(255,255,255,0.08)";
    } else {
      el.style.background = "transparent";
      el.style.backdropFilter = "none";
      el.style.borderBottomColor = "transparent";
    }
  };
  window.addEventListener("scroll", onNavScroll);
  onNavScroll();

  function showSuccess(
    successId: string,
    hideForm: boolean,
    form: HTMLFormElement | null,
  ) {
    const s = document.getElementById(successId);
    if (s) {
      s.style.cssText = s.style.cssText.replace("display:none", "display:block");
      s.style.display = "block";
    }
    if (hideForm && form) form.style.display = "none";
    else if (form) form.reset();
  }

  function submitForm(
    formId: string,
    successId: string,
    btnId: string | null,
    origText: string,
    hideForm: boolean,
  ) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = btnId
        ? (document.getElementById(btnId) as HTMLButtonElement | null)
        : form.querySelector('button[type="submit"]');
      if (!btn) return;
      btn.textContent = "Sending...";
      btn.disabled = true;

      const data = new FormData(form);
      data.append("_ajax", "true");

      fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (res.ok || res.status === 200) {
            showSuccess(successId, hideForm, form);
            btn.textContent = origText;
            btn.disabled = false;
            return;
          }
          return res.text().then((text) => {
            try {
              const json = JSON.parse(text) as { success?: string | boolean };
              if (json.success === "true" || json.success === true) {
                showSuccess(successId, hideForm, form);
              }
            } catch {
              if (
                text &&
                (text.indexOf("true") !== -1 || text.indexOf("success") !== -1)
              ) {
                showSuccess(successId, hideForm, form);
              }
            }
            btn.textContent = origText;
            btn.disabled = false;
          });
        })
        .catch(() => {
          showSuccess(successId, hideForm, form);
          btn.textContent = origText;
          btn.disabled = false;
        });
    });
  }

  submitForm("demo-form", "demo-success", null, "Request My Demo →", true);
  submitForm("cta-form", "cta-success", "cta-btn", "Book Free Call", true);
  submitForm(
    "contact-form",
    "contact-success",
    "contact-btn",
    "Send Message →",
    false,
  );

  const demoModal = document.getElementById("demo-modal");
  if (demoModal) {
    demoModal.addEventListener("click", (e) => {
      if (e.target === demoModal) {
        (demoModal as HTMLElement).style.display = "none";
      }
    });
  }

  // ROI Calculator
  function updateROI() {
    const calls = parseInt(
      (document.getElementById("calls-slider") as HTMLInputElement)?.value ||
        "0",
    );
    const resumes = parseInt(
      (document.getElementById("resumes-slider") as HTMLInputElement)?.value ||
        "0",
    );
    const rate = parseInt(
      (document.getElementById("rate-slider") as HTMLInputElement)?.value ||
        "0",
    );
    const missed = parseInt(
      (document.getElementById("missed-slider") as HTMLInputElement)?.value ||
        "0",
    );

    const setText = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText("calls-val", String(calls));
    setText("resumes-val", String(resumes));
    setText("rate-val", "$" + rate);
    setText("missed-val", String(missed));

    const callHours = calls * 0.08;
    const resumeHours = resumes * 0.25;
    const totalHrsWeek = Math.round(callHours + resumeHours);
    const costPerMonth = Math.round(totalHrsWeek * rate * 4.3);
    const leadsPerMonth = missed * 4;
    const annualSaving = costPerMonth * 12;

    setText("hours-saved", totalHrsWeek + " hrs");
    setText("cost-saved", "$" + costPerMonth.toLocaleString());
    setText("leads-recovered", leadsPerMonth + "/mo");
    setText("annual-saved", "$" + annualSaving.toLocaleString());
  }

  ["calls-slider", "resumes-slider", "rate-slider", "missed-slider"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updateROI);
    },
  );

  function revealOnScroll() {
    const reveals = document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right",
    );
    const windowH = window.innerHeight;
    reveals.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top < windowH - 80) {
        el.classList.add("visible");
      }
    });
  }
  window.addEventListener("scroll", revealOnScroll);
  window.addEventListener("load", revealOnScroll);
  revealOnScroll();

  // Hero word cycler
  const words = [
    "Answers Every Call",
    "Books Appointments",
    "Screens Your Resumes",
    "Posts Your Content",
    "Qualifies Your Leads",
    "Works While You Sleep",
  ];
  let wordIdx = 0;
  const heroWord = document.getElementById("hero-word");
  if (heroWord) {
    setInterval(() => {
      heroWord.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      heroWord.style.opacity = "0";
      heroWord.style.transform = "translateY(-16px)";
      setTimeout(() => {
        wordIdx = (wordIdx + 1) % words.length;
        heroWord.textContent = words[wordIdx];
        heroWord.style.transition = "none";
        heroWord.style.transform = "translateY(16px)";
        heroWord.style.opacity = "0";
        heroWord.getBoundingClientRect();
        heroWord.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        heroWord.style.opacity = "1";
        heroWord.style.transform = "translateY(0)";
      }, 320);
    }, 2800);
  }

  // Call player
  let playing = false;
  let callTimer: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;
  const totalSecs = 87;
  const shown: Record<number, boolean> = {};

  const callScript = [
    { t: 3, side: "human", text: "Hi, I was hoping to book an appointment for next week?" },
    { t: 6, side: "ai", text: "Of course! We have availability on Tuesday at 2 PM and Thursday at 10 AM. Which works better for you?" },
    { t: 16, side: "human", text: "Thursday at 10 works great." },
    { t: 20, side: "ai", text: "Perfect! Can I get your name and a callback number?" },
    { t: 26, side: "human", text: "Sure — James Miller, 416-555-0192." },
    { t: 32, side: "ai", text: "Got it James! You're booked for Thursday at 10 AM. A confirmation text is on its way. Anything else?" },
    { t: 44, side: "human", text: "No that's everything, thanks!" },
    { t: 48, side: "ai", text: "Our pleasure! See you Thursday. Have a great day!" },
    { t: 55, side: "done", text: "" },
  ];

  const fmt = (s: number) =>
    Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + Math.floor(s % 60);

  function addMessage(side: string, text: string) {
    const tr = document.getElementById("call-transcript");
    if (!tr) return;
    const isAI = side === "ai";
    const typing = document.createElement("div");
    typing.className = "call-msg " + (isAI ? "ai" : "human") + " show";
    typing.innerHTML = isAI
      ? '<div class="call-msg-av ai-av">🎙️</div><div class="call-msg-bubble" style="padding:8px 14px"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>'
      : '<div class="call-msg-av human">JM</div><div class="call-msg-bubble" style="padding:8px 14px"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';
    tr.appendChild(typing);
    tr.scrollTop = tr.scrollHeight;
    setTimeout(() => {
      typing.innerHTML = isAI
        ? '<div class="call-msg-av ai-av">🎙️</div><div class="call-msg-bubble">' + text + "</div>"
        : '<div class="call-msg-av human">JM</div><div class="call-msg-bubble">' + text + "</div>";
      tr.scrollTop = tr.scrollHeight;
    }, 900);
  }

  function setPlayIcon(isPlaying: boolean) {
    const btn = document.getElementById("play-btn");
    if (!btn) return;
    const playIcon = btn.querySelector(".play-icon") as HTMLElement | null;
    const pauseIcon = btn.querySelector(".pause-icon") as HTMLElement | null;
    if (playIcon) playIcon.style.display = isPlaying ? "none" : "block";
    if (pauseIcon) pauseIcon.style.display = isPlaying ? "block" : "none";
  }

  function tick() {
    elapsed++;
    if (elapsed >= totalSecs) {
      if (callTimer) clearInterval(callTimer);
      playing = false;
      setPlayIcon(false);
      return;
    }
    const fill = document.getElementById("call-progress");
    const cur = document.getElementById("call-current");
    const head = document.getElementById("call-timer");
    if (fill) fill.style.width = (elapsed / totalSecs) * 100 + "%";
    if (cur) cur.textContent = fmt(elapsed);
    if (head) head.textContent = fmt(elapsed) + " / " + fmt(totalSecs);

    callScript.forEach((msg, i) => {
      if (shown[i] || elapsed < msg.t) return;
      shown[i] = true;
      if (msg.side === "done") {
        const c = document.getElementById("booking-confirmed");
        if (c) (c as HTMLElement).style.display = "block";
        return;
      }
      addMessage(msg.side, msg.text);
    });
  }

  window.toggleCall = () => {
    if (playing) {
      if (callTimer) clearInterval(callTimer);
      playing = false;
      setPlayIcon(false);
    } else {
      playing = true;
      setPlayIcon(true);
      callTimer = setInterval(tick, 1000);
    }
  };

  window.seekCall = (e: MouseEvent) => {
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / bar.offsetWidth;
    elapsed = Math.floor(pct * totalSecs);
    const fill = document.getElementById("call-progress");
    const cur = document.getElementById("call-current");
    if (fill) fill.style.width = pct * 100 + "%";
    if (cur) cur.textContent = fmt(elapsed);
  };

  // Process steps
  let processCurrent = 0;
  const processTotal = 4;
  let processAutoTimer: ReturnType<typeof setInterval> | null = null;
  const lineWidths = ["0%", "33.33%", "66.66%", "100%"];

  function setProcessStep(idx: number) {
    processCurrent = idx;
    for (let i = 0; i < processTotal; i++) {
      const step = document.getElementById("pstep-" + i);
      const desc = document.getElementById("pdesc-" + i);
      if (!step || !desc) continue;
      step.classList.remove("active", "done");
      desc.classList.remove("active");
      if (i < idx) step.classList.add("done");
      else if (i === idx) step.classList.add("active");
    }
    const activeDesc = document.getElementById("pdesc-" + idx);
    if (activeDesc) activeDesc.classList.add("active");
    const line = document.getElementById("process-line");
    if (line) {
      line.style.width = lineWidths[idx];
      line.classList.toggle("active", idx < processTotal - 1);
    }
    const btn = document.getElementById("process-next-btn");
    if (btn) {
      btn.textContent =
        idx === processTotal - 1 ? "Book a Free Call →" : "Next Step →";
      btn.setAttribute("data-last", idx === processTotal - 1 ? "1" : "0");
    }
  }

  function startProcessAuto() {
    processAutoTimer = setInterval(() => {
      const next = (processCurrent + 1) % processTotal;
      setProcessStep(next);
    }, 3500);
  }

  function goToProcessStep(idx: number) {
    if (processAutoTimer) {
      clearInterval(processAutoTimer);
      processAutoTimer = null;
    }
    setProcessStep(idx);
    startProcessAuto();
  }

  window.goToStep = goToProcessStep;
  window.nextStep = () => {
    if (processCurrent >= processTotal - 1) {
      openCalendly();
      return;
    }
    goToProcessStep(processCurrent + 1);
  };
  window.prevStep = () => {
    if (processCurrent > 0) goToProcessStep(processCurrent - 1);
  };

  const processSection = document.getElementById("how");
  if (processSection && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !processAutoTimer) {
            setProcessStep(0);
            startProcessAuto();
          } else if (!entry.isIntersecting && processAutoTimer) {
            clearInterval(processAutoTimer);
            processAutoTimer = null;
          }
        });
      },
      { threshold: 0.3 },
    );
    obs.observe(processSection);
  } else {
    startProcessAuto();
  }

  // Calendly
  let calLoaded = false;
  const calOverlay = document.getElementById("calOverlay");
  const calBody = document.getElementById("calBody");
  const calSetupMsg = document.getElementById("calSetupMsg");

  function openCalendly() {
    if (!calOverlay) return;
    calOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    if (!calLoaded && calBody && calSetupMsg) {
      calSetupMsg.style.display = "none";
      const widget = document.createElement("div");
      widget.className = "calendly-inline-widget";
      widget.style.height = "100%";
      const url =
        CALENDLY_URL +
        "?hide_event_type_details=1&hide_gdpr_banner=1&background_color=111111&text_color=f0f0f0&primary_color=E87B2C";
      widget.setAttribute("data-url", url);
      calBody.appendChild(widget);
      if (window.Calendly) {
        window.Calendly.initInlineWidget({ url, parentElement: widget });
      }
      calLoaded = true;
    }
  }

  function closeCalendly() {
    if (!calOverlay) return;
    calOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  window.openCalendly = openCalendly;

  const calClose = document.getElementById("calClose");
  if (calClose) calClose.addEventListener("click", closeCalendly);
  if (calOverlay) {
    calOverlay.addEventListener("click", (e) => {
      if (e.target === calOverlay) closeCalendly();
    });
  }

  window.addEventListener("message", (e: MessageEvent) => {
    const data = e.data as { event?: string };
    if (data.event === "calendly.event_scheduled") {
      closeCalendly();
    }
  });

  const heroBookBtn = document.getElementById("heroBookBtn");
  if (heroBookBtn) {
    heroBookBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCalendly();
    });
  }

  const ctaForm = document.getElementById("cta-form");
  if (ctaForm) {
    ctaForm.addEventListener("submit", () => {
      setTimeout(openCalendly, 800);
    });
  }

  return () => {
    window.removeEventListener("scroll", onNavScroll);
    window.removeEventListener("scroll", revealOnScroll);
    window.removeEventListener("keydown", onEscape);
    delete window.toggleFaq;
    delete window.toggleCall;
    delete window.seekCall;
    delete window.goToStep;
    delete window.nextStep;
    delete window.prevStep;
    delete window.openCalendly;
  };
}

type NewLandingPageProps = {
  html: string;
};

export function NewLandingPage({ html }: NewLandingPageProps) {
  const patchedHtml = patchLandingHtml(html);

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
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <div
        className="newui-landing"
        dangerouslySetInnerHTML={{ __html: patchedHtml }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
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
