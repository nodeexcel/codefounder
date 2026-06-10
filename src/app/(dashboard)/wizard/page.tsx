"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AGENTS, type AgentType, getAgentById } from "@/lib/agents";
import { createClient } from "@/lib/supabase";
import { loadWizardProgress, saveWizardProgress } from "@/lib/wizard/storage";
import {
  AVAILABLE_AGENT_TYPES,
  BUSINESS_CATEGORIES,
  DAY_LABELS,
  DAYS,
  TIMEZONES,
  VOICE_TONES,
  WIZARD_STEPS,
  createInitialWizardData,
  formatWeekSchedule,
  type DayKey,
  type WizardFormData,
} from "@/lib/types/wizard";


const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--card-elevated)",
  border: "1px solid var(--border2)",
  color: "var(--foreground)",
  padding: "10px 16px",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--card-elevated)",
  border: "1px solid var(--border2)",
  color: "var(--foreground)",
  padding: "10px 16px",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  resize: "vertical",
  transition: "border-color 0.2s",
};

const timeInputStyle: React.CSSProperties = {
  background: "#242424",
  border: "1px solid var(--border2)",
  color: "white",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "14px",
  outline: "none",
};

function WizardContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("agent") as AgentType | null;
  const validPreselect =
    preselected && AVAILABLE_AGENT_TYPES.includes(preselected)
      ? preselected
      : null;
  const reconfigure = searchParams.get("reconfigure") === "true";
  const isNew = searchParams.get("new") === "true";

  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardFormData>(() =>
    createInitialWizardData(validPreselect ?? "voice")
  );
  const [launched, setLaunched] = useState(false);
  const [launchSummary, setLaunchSummary] = useState<{
    agentName: string;
    businessName: string;
    phoneNumber: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [calendarChecking, setCalendarChecking] = useState(false);
  const [testCallActive, setTestCallActive] = useState(false);
  const [testCallConnecting, setTestCallConnecting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState<string | null>(null);
  const vapiRef = useRef<import("@vapi-ai/web").default | null>(null);

  const selectedAgent = data.agentType ? getAgentById(data.agentType) : null;

  const updateBusiness = useCallback(
    (partial: Partial<WizardFormData["business"]>) => {
      setData((prev) => ({ ...prev, business: { ...prev.business, ...partial } }));
    },
    []
  );

  const updateVoice = useCallback(
    (partial: Partial<WizardFormData["voice"]>) => {
      setData((prev) => ({ ...prev, voice: { ...prev.voice, ...partial } }));
    },
    []
  );

  const updateDaySchedule = useCallback(
    (day: DayKey, partial: Partial<WizardFormData["business"]["hours"][DayKey]>) => {
      setData((prev) => ({
        ...prev,
        business: {
          ...prev.business,
          hours: {
            ...prev.business.hours,
            [day]: { ...prev.business.hours[day], ...partial },
          },
        },
      }));
    },
    []
  );

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      const saved = await loadWizardProgress(supabase, user.id, "voice");
      if (saved && !isNew) {
        setData(saved.data);
        // Restore vapiPhoneNumberId from persisted voice_settings
        const savedVapiId = (saved.data.voice as unknown as Record<string, unknown>)
          .vapiPhoneNumberId as string | undefined;
        if (savedVapiId) setVapiPhoneNumberId(savedVapiId);
        if (saved.status === "live" && !reconfigure) {
          setLaunchSummary({
            agentName: saved.data.voice.agentName.trim(),
            businessName: saved.data.business.businessName.trim(),
            phoneNumber: saved.data.voice.phoneNumber || "",
          });
          setLaunched(true);
        } else if (reconfigure) {
          // Reset to draft at step 1 so user can edit with existing data pre-filled
          await saveWizardProgress(supabase, user.id, saved.data, 1, "draft");
          setStep(1);
        } else {
          setStep(saved.step);
        }
      } else if (validPreselect) {
        setData(createInitialWizardData(validPreselect));
      }

      setLoading(false);
    }
    init();
  }, [supabase, validPreselect]);

  // Auto-detect Google calendar connection when reaching step 3
  useEffect(() => {
    if (step !== 3 || data.voice.calendarConnected) return;
    async function checkCalendar() {
      setCalendarChecking(true);
      try {
        const { data: identData } = await supabase.auth.getUserIdentities();
        const googleIdentity = identData?.identities?.find(
          (id) => id.provider === "google"
        );
        if (googleIdentity) {
          const email =
            (googleIdentity.identity_data?.email as string | undefined) ?? "";
          updateVoice({ calendarConnected: true, calendarEmail: email });
        }
      } catch {
        // non-fatal
      } finally {
        setCalendarChecking(false);
      }
    }
    checkCalendar();
  }, [step, data.voice.calendarConnected, supabase, updateVoice]);

  const persistProgress = useCallback(
    async (nextStep: number, status: "draft" | "live" = "draft") => {
      if (!userId) return { error: "Not authenticated" };
      setSaving(true);
      setSaveError(null);
      const { error } = await saveWizardProgress(supabase, userId, data, nextStep, status);
      setSaving(false);
      if (error) setSaveError(error);
      return { error };
    },
    [userId, supabase, data]
  );

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return data.agentType !== null && AVAILABLE_AGENT_TYPES.includes(data.agentType);
      case 1: {
        const { businessName, category, services, location, phone } = data.business;
        const hasOpenDay = DAYS.some((d) => !data.business.hours[d].closed);
        return (
          businessName.trim().length >= 2 &&
          category !== "" &&
          services.trim().length >= 3 &&
          location.trim().length >= 5 &&
          phone.trim().length >= 7 &&
          hasOpenDay
        );
      }
      case 2:
        return data.voice.agentName.trim().length >= 2;
      case 3:
        return true; // calendar connect is optional
      case 4:
        return true; // phone is optional
      default:
        return true;
    }
  }

  async function handleNext() {
    if (!canProceed()) return;
    const nextStep = step + 1;
    const { error } = await persistProgress(nextStep);
    if (!error) setStep(nextStep);
  }

  async function handleBack() {
    if (step === 0) return;
    const prevStep = step - 1;
    const { error } = await persistProgress(prevStep);
    if (!error) setStep(prevStep);
  }

  async function handleConnectCalendar() {
    await persistProgress(step);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar",
        redirectTo: `${window.location.origin}/auth/callback?next=/wizard`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function handleProvisionNumber() {
    setProvisioning(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/twilio/provision-number", { method: "POST" });
      const result = (await res.json()) as {
        phoneNumber?: string;
        vapiPhoneNumberId?: string | null;
        error?: string;
      };
      if (!res.ok || !result.phoneNumber) {
        setSaveError(result.error ?? "Failed to provision phone number.");
        return;
      }
      updateVoice({ phoneNumber: result.phoneNumber, phoneOption: "new" });
      setVapiPhoneNumberId(result.vapiPhoneNumberId ?? null);
      // Persist immediately so the number survives a page reload
      if (userId) {
        await saveWizardProgress(supabase, userId, {
          ...data,
          voice: { ...data.voice, phoneNumber: result.phoneNumber, phoneOption: "new" },
        }, step);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to provision phone number.");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleLaunch() {
    if (!userId) { setSaveError("Not authenticated"); return; }

    const summary = {
      agentName: data.voice.agentName.trim(),
      businessName: data.business.businessName.trim(),
      phoneNumber: data.voice.phoneNumber,
    };

    setSaving(true);
    setSaveError(null);

    try {
      const vapiResponse = await fetch("/api/vapi/update-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: data, vapiPhoneNumberId }),
      });

      const vapiResult = await vapiResponse.json();

      if (!vapiResponse.ok) {
        setSaveError(vapiResult.error ?? "Failed to update Vapi assistant.");
        return;
      }

      const { error } = await saveWizardProgress(supabase, userId, data, step, "live");
      if (error) { setSaveError(error); return; }

      if (vapiResult.assistantId) {
        await supabase
          .from("agent_wizard_sessions")
          .update({ vapi_assistant_id: vapiResult.assistantId })
          .eq("user_id", userId)
          .eq("agent_type", data.agentType ?? "voice");
      }

      setLaunchSummary(summary);
      setLaunched(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to launch Voice Agent");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestCall() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setSaveError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set — test calls require a Vapi public key.");
      return;
    }

    if (testCallActive) {
      vapiRef.current?.stop();
      setTestCallActive(false);
      return;
    }

    if (testCallConnecting) return;

    setSaveError(null);
    setTestCallConnecting(true);

    const { data: sessionRow } = await supabase
      .from("agent_wizard_sessions")
      .select("vapi_assistant_id")
      .eq("user_id", userId!)
      .eq("agent_type", data.agentType ?? "voice")
      .maybeSingle();

    const assistantId = (sessionRow as { vapi_assistant_id?: string } | null)
      ?.vapi_assistant_id;

    if (!assistantId) {
      setSaveError("No assistant found. Click 'Go Live' first to create your assistant.");
      setTestCallConnecting(false);
      return;
    }

    try {
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapi.on("call-end", () => {
        setTestCallActive(false);
        setTestCallConnecting(false);
      });
      vapi.on("error", (err: unknown) => {
        setTestCallActive(false);
        setTestCallConnecting(false);
        setSaveError(err instanceof Error ? err.message : "Test call encountered an error.");
      });
      await vapi.start(assistantId);
      setTestCallConnecting(false);
      setTestCallActive(true);
    } catch (err) {
      setTestCallConnecting(false);
      setSaveError(err instanceof Error ? err.message : "Failed to start test call.");
    }
  }

  function selectAgent(agentId: AgentType) {
    if (!AVAILABLE_AGENT_TYPES.includes(agentId)) return;
    setData((prev) => ({ ...prev, agentType: agentId }));
  }

  if (loading) {
    return (
      <>
        <DashboardNavbar title="Setup Wizard" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[#888]">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          Loading your progress...
        </div>
      </>
    );
  }

  if (launched) {
    return (
      <>
        <DashboardNavbar title="Setup Wizard" />
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-xl p-8 text-center"
            style={{
              background: "var(--card-elevated)",
              border: "1px solid rgba(255,122,26,0.3)",
              boxShadow: "0 0 40px rgba(232, 123, 44, 0.08)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }}
            />
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{ background: "rgba(34,197,94,0.1)", boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}
            >
              ✓
            </div>
            <h2 className="font-[Outfit] text-2xl font-bold text-white">Voice Agent is live!</h2>
            <p className="mt-2 text-[#888]">
              {launchSummary?.agentName || data.voice.agentName || "Your agent"}{" "}
              is ready to handle calls for{" "}
              {launchSummary?.businessName || data.business.businessName || "your business"}.
            </p>
            {launchSummary?.phoneNumber && (
              <div
                className="mt-4 rounded-lg px-4 py-3"
                style={{ background: "rgba(255,122,26,0.07)", border: "1px solid rgba(255,122,26,0.2)" }}
              >
                <p className="text-xs text-[#888]">Assigned phone number</p>
                <p className="mt-1 font-[Outfit] text-lg font-bold text-[var(--accent)]">
                  {launchSummary.phoneNumber}
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href="/dashboard">Go to dashboard</Button>
              <Button href="/agents" variant="secondary">View agents</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar
        title="Setup Wizard"
        subtitle={`Step ${step + 1} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[step]}`}
      />

      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <p className="mb-6 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
          Agent Configuration
        </p>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-[#888]">Progress</span>
            <span className="font-[Outfit] font-semibold text-[var(--accent)]">
              {Math.round(((step + 1) / WIZARD_STEPS.length) * 100)}%
            </span>
          </div>

          <div className="flex justify-between gap-1 sm:gap-2">
            {WIZARD_STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
                  style={
                    i === step
                      ? { background: "var(--accent)", color: "white", boxShadow: "0 0 16px rgba(255,122,26,0.5)" }
                      : i < step
                        ? { background: "var(--accent)", color: "white", boxShadow: "0 0 8px rgba(255,122,26,0.2)" }
                        : { background: "var(--surface2)", color: "var(--muted)" }
                  }
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className="mt-2 hidden text-center text-[10px] leading-tight font-[Outfit] transition-colors duration-300 sm:block sm:text-[11px]"
                  style={{ color: i <= step ? "var(--accent)" : "var(--muted)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full"
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((step + 1) / WIZARD_STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                boxShadow: "0 0 8px rgba(232, 123, 44, 0.5)",
              }}
            />
          </div>
        </div>

        {saveError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {saveError}
          </p>
        )}

        <div
          className="relative overflow-hidden rounded-xl p-6 sm:p-8"
          style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
        >
          {/* ── Step 0 — Choose Agent ─────────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <h2 className="font-[Outfit] mb-2 text-xl font-bold text-white">
                Choose your agent type
              </h2>
              <p className="mb-6 text-sm text-[#888]">
                AI Receptionist is available now. More agents are launching soon.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {AGENTS.map((agent) => {
                  const available = AVAILABLE_AGENT_TYPES.includes(agent.id);
                  const selected = data.agentType === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      disabled={!available}
                      onClick={() => selectAgent(agent.id)}
                      className="relative rounded-xl p-4 text-left transition-all duration-200"
                      style={{
                        background: selected ? "var(--accent-glow)" : "var(--card-elevated)",
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border2)",
                        cursor: available ? "pointer" : "not-allowed",
                        opacity: available ? 1 : 0.6,
                        boxShadow: selected
                          ? "0 0 20px rgba(255,122,26,0.1), inset 0 0 20px rgba(255,122,26,0.03)"
                          : undefined,
                      }}
                    >
                      {!available && (
                        <span
                          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#888]"
                          style={{ background: "var(--border)", border: "1px solid var(--border2)" }}
                        >
                          Coming Soon
                        </span>
                      )}
                      <span className="text-2xl">{agent.icon}</span>
                      <p className="mt-2 font-[Outfit] font-semibold text-white">{agent.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#888]">{agent.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 1 — Business Profile ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-[Outfit] text-xl font-bold text-white">Business profile</h2>
                <p className="mt-1 text-sm text-[#888]">
                  Help your AI Receptionist answer caller questions accurately.
                </p>
              </div>

              <Input
                label="Business name"
                placeholder="Acme Dental Studio"
                value={data.business.businessName}
                onChange={(e) => updateBusiness({ businessName: e.target.value })}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  Industry / category
                </label>
                <select
                  value={data.business.category}
                  onChange={(e) =>
                    updateBusiness({ category: e.target.value as WizardFormData["business"]["category"] })
                  }
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} style={{ background: "var(--card-elevated)" }}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  Timezone
                </label>
                <select
                  value={data.business.timezone}
                  onChange={(e) => updateBusiness({ timezone: e.target.value })}
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} style={{ background: "var(--card-elevated)" }}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Business phone number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={data.business.phone}
                onChange={(e) => updateBusiness({ phone: e.target.value })}
              />

              <Input
                label="Business location / address"
                placeholder="123 Main St, Austin, TX 78701"
                value={data.business.location}
                onChange={(e) => updateBusiness({ location: e.target.value })}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-[#AAAAAA]">
                  Business hours
                </label>
                <div
                  className="space-y-2 rounded-lg p-3"
                  style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
                >
                  {DAYS.map((day) => {
                    const schedule = data.business.hours[day];
                    return (
                      <div
                        key={day}
                        className="flex flex-wrap items-center gap-2 pb-2 last:pb-0 sm:flex-nowrap"
                        style={{ borderBottom: "1px solid var(--surface)" }}
                      >
                        <span className="w-24 shrink-0 text-sm text-[#AAAAAA]">{DAY_LABELS[day]}</span>
                        <label className="flex items-center gap-1.5 text-xs text-[#888]">
                          <input
                            type="checkbox"
                            checked={schedule.closed}
                            onChange={(e) => updateDaySchedule(day, { closed: e.target.checked })}
                            className="accent-[var(--accent)]"
                          />
                          Closed
                        </label>
                        {!schedule.closed && (
                          <>
                            <input
                              type="time"
                              value={schedule.open}
                              onChange={(e) => updateDaySchedule(day, { open: e.target.value })}
                              style={timeInputStyle}
                            />
                            <span className="text-[#888]">to</span>
                            <input
                              type="time"
                              value={schedule.close}
                              onChange={(e) => updateDaySchedule(day, { close: e.target.value })}
                              style={timeInputStyle}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  Services offered
                </label>
                <textarea
                  value={data.business.services}
                  onChange={(e) => updateBusiness({ services: e.target.value })}
                  rows={4}
                  placeholder="List your main services, e.g. cleanings, whitening, emergency care..."
                  style={textareaStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                />
              </div>
            </div>
          )}

          {/* ── Step 2 — Configure Agent ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-[Outfit] text-xl font-bold text-white">Configure agent</h2>
                <p className="mt-1 text-sm text-[#888]">
                  Set how your AI Receptionist sounds and handles calls.
                </p>
              </div>

              <Input
                label="Agent name"
                placeholder="Alex from Acme Dental"
                hint="What the AI introduces itself as on calls"
                value={data.voice.agentName}
                onChange={(e) => updateVoice({ agentName: e.target.value })}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  Greeting message (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Hi, thanks for calling ${data.business.businessName || "us"}! This is ${data.voice.agentName || "your AI receptionist"}, how can I help you today?`}
                  style={textareaStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                />
                <p className="mt-1 text-xs text-[#666]">Leave blank to use the auto-generated greeting.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  FAQs / common questions (optional)
                </label>
                <textarea
                  rows={4}
                  placeholder={"Q: What are your hours?\nA: We're open Mon–Fri 9am–5pm.\n\nQ: Do you accept walk-ins?\nA: Yes, walk-ins are welcome."}
                  style={textareaStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#AAAAAA]">
                  Response tone
                </label>
                <select
                  value={data.voice.tone}
                  onChange={(e) =>
                    updateVoice({ tone: e.target.value as WizardFormData["voice"]["tone"] })
                  }
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,122,26,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                >
                  {VOICE_TONES.map((tone) => (
                    <option key={tone} value={tone} style={{ background: "var(--card-elevated)" }}>{tone}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Forward calls to (optional)"
                type="tel"
                placeholder="+1 (555) 987-6543"
                hint="Human backup number when the agent escalates a call"
                value={data.voice.forwardTo}
                onChange={(e) => updateVoice({ forwardTo: e.target.value })}
              />
            </div>
          )}

          {/* ── Step 3 — Connect Calendar ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-[Outfit] text-xl font-bold text-white">Connect Google Calendar</h2>
                <p className="mt-1 text-sm text-[#888]">
                  Allow your AI Receptionist to book appointments directly into your calendar.
                </p>
              </div>

              {calendarChecking ? (
                <div className="flex items-center gap-3 text-[#888]">
                  <div
                    className="h-5 w-5 animate-spin rounded-full border-2"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                  Checking connection…
                </div>
              ) : data.voice.calendarConnected ? (
                <div
                  className="flex items-start gap-4 rounded-xl p-5"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                    style={{ background: "rgba(34,197,94,0.12)" }}
                  >
                    ✓
                  </div>
                  <div>
                    <p className="font-[Outfit] font-semibold text-white">Calendar connected</p>
                    {data.voice.calendarEmail && (
                      <p className="mt-0.5 text-sm text-[#888]">{data.voice.calendarEmail}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => updateVoice({ calendarConnected: false, calendarEmail: "" })}
                      className="mt-2 text-xs text-[#666] underline hover:text-[#888]"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-5"
                  style={{ background: "var(--card-elevated)", border: "1px solid var(--border2)" }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="font-medium text-white">Google Calendar</p>
                      <p className="text-sm text-[#888]">Book appointments automatically on your behalf</p>
                    </div>
                  </div>
                  <Button onClick={handleConnectCalendar} variant="secondary" size="md">
                    Connect Google Calendar
                  </Button>
                </div>
              )}

              <div
                className="rounded-lg p-4"
                style={{ background: "rgba(255,122,26,0.04)", border: "1px solid rgba(255,122,26,0.12)" }}
              >
                <p className="text-xs leading-relaxed text-[#888]">
                  <span className="font-medium text-[var(--accent)]">What access is requested: </span>
                  Read and write access to your Google Calendar to create appointment events.
                  You can revoke access at any time from your Google account settings.
                </p>
              </div>

              <p className="text-center text-xs text-[#555]">
                You can skip this step and connect later from your agent settings.
              </p>
            </div>
          )}

          {/* ── Step 4 — Phone Number ─────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-[Outfit] text-xl font-bold text-white">Connect a phone number</h2>
                <p className="mt-1 text-sm text-[#888]">
                  Choose how callers will reach your AI Receptionist.
                </p>
              </div>

              {/* Option buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                {(["new", "forward"] as const).map((opt) => {
                  const selected = data.voice.phoneOption === opt;
                  const label = opt === "new" ? "Get a new number" : "Forward my existing number";
                  const desc =
                    opt === "new"
                      ? "Provision a dedicated Twilio number for your agent"
                      : "Keep your current number — calls are forwarded to the AI";
                  const icon = opt === "new" ? "📱" : "↪️";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateVoice({ phoneOption: opt })}
                      className="rounded-xl p-4 text-left transition-all duration-200"
                      style={{
                        background: selected ? "var(--accent-glow)" : "var(--card-elevated)",
                        border: selected ? "1px solid var(--accent)" : "1px solid var(--border2)",
                        boxShadow: selected
                          ? "0 0 20px rgba(255,122,26,0.08)"
                          : undefined,
                      }}
                    >
                      <span className="text-2xl">{icon}</span>
                      <p className="mt-2 font-[Outfit] font-semibold text-white">{label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#888]">{desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* "Get a new number" — provision via Twilio */}
              {data.voice.phoneOption === "new" && (
                <div>
                  {data.voice.phoneNumber ? (
                    // Number already provisioned — show it
                    <div
                      className="flex items-center justify-between rounded-xl px-5 py-4"
                      style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}
                    >
                      <div>
                        <p className="text-xs text-[#888]">Your dedicated number</p>
                        <p className="mt-0.5 font-[Outfit] text-xl font-bold text-white">
                          {data.voice.phoneNumber}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold text-[#22c55e]"
                        style={{ background: "rgba(34,197,94,0.1)" }}
                      >
                        ✓ Provisioned
                      </span>
                    </div>
                  ) : (
                    // Not yet provisioned — show action button
                    <div
                      className="rounded-xl p-5"
                      style={{ background: "var(--card-elevated)", border: "1px solid var(--border2)" }}
                    >
                      <p className="mb-1 text-sm font-medium text-white">
                        Claim your dedicated number
                      </p>
                      <p className="mb-4 text-xs leading-relaxed text-[#888]">
                        We&apos;ll purchase a US Twilio number and link it to your agent automatically.
                      </p>
                      <Button
                        onClick={handleProvisionNumber}
                        disabled={provisioning}
                        size="md"
                      >
                        {provisioning ? (
                          <span className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2"
                              style={{ borderColor: "white", borderTopColor: "transparent" }}
                            />
                            Provisioning…
                          </span>
                        ) : (
                          "Get a phone number"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* "Forward existing number" — input field */}
              {data.voice.phoneOption === "forward" && (
                <div>
                  <Input
                    label="Your existing phone number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    hint="Calls to this number will be answered by your AI Receptionist"
                    value={data.voice.phoneNumber}
                    onChange={(e) => updateVoice({ phoneNumber: e.target.value })}
                  />
                </div>
              )}

              <p className="text-center text-xs text-[#555]">
                You can skip this step and assign a number later from your agent settings.
              </p>
            </div>
          )}

          {/* ── Step 5 — Test & Launch ────────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 className="font-[Outfit] mb-2 text-xl font-bold text-white">
                Test & go live
              </h2>
              <p className="mb-6 text-sm text-[#888]">
                Review your configuration, test the agent, then launch.
              </p>

              {/* Summary */}
              <dl
                className="mb-6 space-y-4 rounded-lg p-4"
                style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
              >
                <ReviewSection title="Agent">
                  <ReviewRow label="Type" value={selectedAgent?.name ?? "AI Receptionist"} />
                </ReviewSection>

                <ReviewSection title="Business">
                  <ReviewRow label="Name" value={data.business.businessName} />
                  <ReviewRow label="Category" value={data.business.category} />
                  <ReviewRow label="Phone" value={data.business.phone} />
                  <ReviewRow label="Location" value={data.business.location} />
                  <ReviewRow label="Timezone" value={data.business.timezone} />
                  <ReviewRow label="Services" value={data.business.services} />
                  <div>
                    <dt className="text-sm text-[#888]">Hours</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm font-medium text-white">
                      {formatWeekSchedule(data.business.hours)}
                    </dd>
                  </div>
                </ReviewSection>

                <ReviewSection title="Agent settings">
                  <ReviewRow label="Name" value={data.voice.agentName} />
                  <ReviewRow label="Tone" value={data.voice.tone} />
                  <ReviewRow label="Forward to" value={data.voice.forwardTo || "Not set"} />
                </ReviewSection>

                <ReviewSection title="Integrations">
                  <ReviewRow
                    label="Google Calendar"
                    value={
                      data.voice.calendarConnected
                        ? `Connected${data.voice.calendarEmail ? ` — ${data.voice.calendarEmail}` : ""}`
                        : "Not connected"
                    }
                  />
                  <ReviewRow
                    label="Phone number"
                    value={data.voice.phoneNumber || "Not assigned"}
                  />
                </ReviewSection>
              </dl>

              {/* Test Call */}
              <div
                className="mb-6 rounded-xl p-5"
                style={{ background: "rgba(255,122,26,0.04)", border: "1px solid rgba(255,122,26,0.15)" }}
              >
                <p className="mb-1 font-[Outfit] font-semibold text-white">Test your agent</p>
                <p className="mb-4 text-sm text-[#888]">
                  Have a live conversation with your AI Receptionist before going live.
                </p>
                <Button
                  variant={testCallActive ? "ghost" : "secondary"}
                  size="md"
                  onClick={handleTestCall}
                  disabled={testCallConnecting}
                >
                  {testCallActive
                    ? "🔴 End call"
                    : testCallConnecting
                      ? "⏳ Starting..."
                      : "🎙️ Start test call"}
                </Button>
                {testCallActive && (
                  <p className="mt-3 text-sm text-[var(--accent)] animate-pulse">
                    Call in progress — speak now…
                  </p>
                )}
                {testCallConnecting && (
                  <p className="mt-3 text-sm text-[#888] animate-pulse">
                    Connecting to your agent…
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div
            className="mt-8 flex justify-between gap-4 pt-6"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Button variant="ghost" onClick={handleBack} disabled={step === 0 || saving}>
              Back
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <div className="flex items-center gap-3">
                {(step === 3 || step === 4) && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-sm text-[#555] transition-colors hover:text-[#888]"
                  >
                    Skip for now →
                  </button>
                )}
                <Button onClick={handleNext} disabled={!canProceed() || saving}>
                  {saving ? "Saving…" : "Continue"}
                </Button>
              </div>
            ) : (
              <Button onClick={handleLaunch} disabled={saving}>
                {saving ? "Launching…" : "Go Live 🚀"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4 last:pb-0" style={{ borderBottom: "1px solid var(--surface2)" }}>
      <h3 className="mb-2 font-[Outfit] text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-[#888]">{label}</dt>
      <dd className="text-right font-medium text-white">{value || "—"}</dd>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#141414] text-[#888]">
          Loading wizard...
        </div>
      }
    >
      <WizardContent />
    </Suspense>
  );
}
