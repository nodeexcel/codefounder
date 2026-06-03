import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AGENTS } from "@/lib/agents";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TypewriterHighlight } from "@/components/landing/TypewriterHighlight";

const STATS = [
  { value: "500+", label: "Businesses onboarded" },
  { value: "4", label: "AI agents ready to deploy" },
  { value: "24/7", label: "Always-on automation" },
];

const STEPS = [
  {
    step: "01",
    title: "Sign up & choose",
    description:
      "Create your account and pick Voice, HR, Marketing, or CRM from the agent catalog.",
    icon: "✦",
  },
  {
    step: "02",
    title: "Complete the wizard",
    description:
      "Answer plain-language questions, connect accounts, and configure your business profile.",
    icon: "◎",
  },
  {
    step: "03",
    title: "Go live",
    description:
      "Launch your agent the same day—calls answered, posts scheduled, leads captured automatically.",
    icon: "◉",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Navbar — glassmorphism */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo href="/" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-3 py-2 text-sm text-gray-300 transition-all duration-300 hover:text-white sm:px-4"
            >
              Login
            </Link>
            <Button href="/signup" size="md">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        {/* Animated gradient background */}
        <div
          className="pointer-events-none absolute inset-0 landing-animate-gradient opacity-90"
          style={{
            background:
              "linear-gradient(135deg, #000000 0%, #1a0a00 25%, #000000 50%, #0d0500 75%, #000000 100%)",
          }}
          aria-hidden
        />

        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            animation: "landing-grid-drift 20s linear infinite",
          }}
          aria-hidden
        />

        {/* Glowing orb */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full landing-animate-pulse-glow"
          style={{
            background:
              "radial-gradient(ellipse, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0.08) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
          aria-hidden
        />

        {/* Floating particles */}
        {[
          { top: "18%", left: "12%", size: 6, delay: "0s" },
          { top: "35%", left: "78%", size: 4, delay: "1.2s" },
          { top: "62%", left: "22%", size: 5, delay: "2.4s" },
          { top: "48%", left: "88%", size: 3, delay: "0.8s" },
          { top: "72%", left: "55%", size: 4, delay: "1.8s" },
        ].map((p, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-[#f97316]/40 landing-animate-float-slow"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.5)",
            }}
            aria-hidden
          />
        ))}

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="landing-animate-fade-in-up landing-opacity-0 landing-delay-100 mb-6 inline-block rounded-full border border-[#222222]/80 bg-[#0a0a0a]/80 px-4 py-1.5 text-sm text-gray-400 backdrop-blur-sm">
            No code · No setup calls · Live the same day
          </p>

          <h1 className="landing-animate-fade-in-up landing-opacity-0 landing-delay-200 text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
            Launch Your AI Agent
            <br />
            <TypewriterHighlight />
          </h1>

          <p className="landing-animate-fade-in-up landing-opacity-0 landing-delay-300 mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
            CodeFounder helps small businesses deploy Voice, HR, Marketing, and
            CRM agents through a simple guided wizard—no technical skills
            required.
          </p>

          <div className="landing-animate-fade-in-up landing-opacity-0 landing-delay-400 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/signup" size="lg">
              Start For Free →
            </Button>
            <Button href="/login" variant="outline" size="lg">
              Sign in
            </Button>
          </div>

          {/* Floating accent orbs */}
          <div
            className="pointer-events-none absolute -left-4 top-1/2 h-24 w-24 rounded-full border border-[#f97316]/20 bg-[#f97316]/5 landing-animate-float hidden lg:block"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-4 top-1/3 h-16 w-16 rounded-full border border-[#f97316]/15 bg-[#f97316]/5 landing-animate-float hidden lg:block"
            style={{ animationDelay: "2s" }}
            aria-hidden
          />
        </div>
      </section>

      {/* Stats — social proof */}
      <section className="relative border-y border-[#222222]/60 bg-[#0a0a0a]/50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className="text-center">
                <p
                  className="text-4xl font-bold sm:text-5xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #fff 0%, #f97316 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[#f97316]">
                How it works
              </p>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Three steps to go live
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-400">
                From signup to a working AI agent in under 10 minutes
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 120}>
                <div
                  className="group relative rounded-2xl border border-[#222222] bg-[#0a0a0a]/80 p-8 backdrop-blur-sm transition-all duration-500 hover:border-[#f97316]/40 hover:shadow-[0_0_40px_rgba(249,115,22,0.12)]"
                >
                  <span className="text-4xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    {item.icon}
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#f97316]">
                    Step {item.step}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="border-t border-[#222222]/60 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[#f97316]">
                Agent catalog
              </p>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Four Powerful AI Agents
              </h2>
              <p className="mt-3 text-gray-400">
                Pick one or deploy all four from a single dashboard
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent, i) => (
              <ScrollReveal key={agent.id} delay={i * 80}>
                <div className="group relative h-full">
                  {/* Gradient border glow on hover */}
                  <div
                    className="absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(249,115,22,0.6), rgba(249,115,22,0.1), rgba(249,115,22,0.4))",
                    }}
                    aria-hidden
                  />
                  <Card
                    padding="md"
                    className="relative flex h-full flex-col border-[#222222]/80 bg-[#0a0a0a]/90 backdrop-blur-md transition-all duration-500 group-hover:scale-[1.03] group-hover:border-transparent group-hover:shadow-[0_0_32px_rgba(249,115,22,0.15)]"
                  >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-2xl transition-all duration-500 group-hover:border-[#f97316]/30 group-hover:bg-[#f97316]/10 group-hover:[animation:landing-icon-bounce_0.5s_ease-in-out]">
                      <span className="transition-transform duration-500 group-hover:scale-110">
                        {agent.icon}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {agent.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">
                      {agent.description}
                    </p>
                    <Link
                      href="/signup"
                      className="mt-4 inline-flex items-center text-sm font-medium text-[#f97316] transition-all duration-300 hover:gap-2 hover:underline"
                    >
                      Get started
                      <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </Card>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#222222] p-8 text-center sm:p-14">
            {/* CTA glow */}
            <div
              className="pointer-events-none absolute inset-0 landing-animate-pulse-glow"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(249, 115, 22, 0.2) 0%, transparent 65%)",
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-[#1a0f08]"
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-2xl font-bold sm:text-4xl">
                Ready to put AI to work?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-gray-400">
                Join CodeFounder and launch your first agent today—free to start,
                live in minutes.
              </p>
              <Button
                href="/signup"
                size="lg"
                className="mt-8 shadow-[0_0_40px_rgba(249,115,22,0.35)] transition-shadow duration-500 hover:shadow-[0_0_56px_rgba(249,115,22,0.45)]"
              >
                Create free account
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222222]/60 px-4 py-10 text-center text-sm text-gray-500">
        <Logo href="/" size="sm" />
        <p className="mt-2">© {new Date().getFullYear()} CodeFounder</p>
      </footer>
    </main>
  );
}
