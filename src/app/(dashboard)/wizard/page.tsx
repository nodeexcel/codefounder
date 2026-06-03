"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Card } from "@/components/ui/Card";
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
  VOICE_TONES,
  WIZARD_STEPS,
  createInitialWizardData,
  formatWeekSchedule,
  type DayKey,
  type WizardFormData,
} from "@/lib/types/wizard";

function WizardContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("agent") as AgentType | null;
  const validPreselect =
    preselected && AVAILABLE_AGENT_TYPES.includes(preselected)
      ? preselected
      : null;

  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardFormData>(() =>
    createInitialWizardData(validPreselect ?? "voice")
  );
  const [launched, setLaunched] = useState(false);
  const [launchSummary, setLaunchSummary] = useState<{
    agentName: string;
    businessName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const selectedAgent = data.agentType ? getAgentById(data.agentType) : null;

  const updateBusiness = useCallback(
    (partial: Partial<WizardFormData["business"]>) => {
      setData((prev) => ({
        ...prev,
        business: { ...prev.business, ...partial },
      }));
    },
    []
  );

  const updateVoice = useCallback(
    (partial: Partial<WizardFormData["voice"]>) => {
      setData((prev) => ({
        ...prev,
        voice: { ...prev.voice, ...partial },
      }));
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const saved = await loadWizardProgress(supabase, user.id, "voice");
      if (saved) {
        setData(saved.data);
        if (saved.status === "live") {
          setLaunchSummary({
            agentName: saved.data.voice.agentName.trim(),
            businessName: saved.data.business.businessName.trim(),
          });
          setLaunched(true);
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

  const persistProgress = useCallback(
    async (nextStep: number, status: "draft" | "live" = "draft") => {
      if (!userId) return { error: "Not authenticated" };

      setSaving(true);
      setSaveError(null);

      const { error } = await saveWizardProgress(
        supabase,
        userId,
        data,
        nextStep,
        status
      );

      setSaving(false);
      if (error) setSaveError(error);
      return { error };
    },
    [userId, supabase, data]
  );

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return (
          data.agentType !== null &&
          AVAILABLE_AGENT_TYPES.includes(data.agentType)
        );
      case 1: {
        const { businessName, category, services, location, phone } =
          data.business;
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

  async function handleLaunch() {
    if (!userId) {
      setSaveError("Not authenticated");
      return;
    }

    const summary = {
      agentName: data.voice.agentName.trim(),
      businessName: data.business.businessName.trim(),
    };

    setSaving(true);
    setSaveError(null);

    try {
      const vapiResponse = await fetch("/api/vapi/update-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: data }),
      });

      const vapiResult = await vapiResponse.json();

      if (!vapiResponse.ok) {
        setSaveError(
          vapiResult.error ?? "Failed to update Vapi assistant. Check your API keys."
        );
        return;
      }

      const { error } = await saveWizardProgress(
        supabase,
        userId,
        data,
        step,
        "live"
      );

      if (error) {
        setSaveError(error);
        return;
      }

      setLaunchSummary(summary);
      setLaunched(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to launch Voice Agent"
      );
    } finally {
      setSaving(false);
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
        <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
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
          <Card className="max-w-md text-center" padding="lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white">Voice Agent is live!</h2>
            <p className="mt-2 text-gray-400">
              {launchSummary?.agentName || data.voice.agentName || "Your agent"}{" "}
              is ready to handle calls for{" "}
              {launchSummary?.businessName ||
                data.business.businessName ||
                "your business"}
              .
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href="/dashboard">Go to dashboard</Button>
              <Button href="/agents" variant="secondary">
                View agents
              </Button>
            </div>
          </Card>
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
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="font-medium text-[#f97316]">
              {Math.round(((step + 1) / WIZARD_STEPS.length) * 100)}%
            </span>
          </div>
          <div className="flex justify-between gap-1 sm:gap-2">
            {WIZARD_STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold sm:text-sm",
                    i <= step
                      ? "bg-[#f97316] text-white shadow-lg shadow-orange-500/20"
                      : "bg-[#222222] text-gray-500",
                  ].join(" ")}
                >
                  {i + 1}
                </div>
                <span
                  className={[
                    "mt-2 hidden text-center text-[10px] leading-tight sm:block sm:text-xs",
                    i <= step ? "text-[#f97316]" : "text-gray-500",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#222222]">
            <div
              className="h-full rounded-full bg-[#f97316] transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {saveError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {saveError}
          </p>
        )}

        <Card padding="lg">
          {/* Step 1 — Choose Agent */}
          {step === 0 && (
            <div>
              <h2 className="mb-2 text-xl font-bold text-white">
                Choose your agent
              </h2>
              <p className="mb-6 text-sm text-gray-400">
                Voice Agent is available now. More agents are launching soon.
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
                      className={[
                        "relative rounded-xl border p-4 text-left transition-all",
                        available
                          ? selected
                            ? "border-[#f97316] bg-[#f97316]/5 ring-1 ring-[#f97316]"
                            : "border-[#222222] hover:border-[#f97316]/40"
                          : "cursor-not-allowed border-[#222222]/60 bg-[#0a0a0a]/50 opacity-60",
                      ].join(" ")}
                    >
                      {!available && (
                        <span className="absolute right-3 top-3 rounded-full border border-[#222222] bg-[#111111] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Coming Soon
                        </span>
                      )}
                      <span className="text-2xl">{agent.icon}</span>
                      <p className="mt-2 font-semibold text-white">
                        {agent.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        {agent.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Business Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Business details</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Help your Voice Agent answer caller questions accurately.
                </p>
              </div>

              <Input
                label="Business name"
                placeholder="Acme Dental Studio"
                value={data.business.businessName}
                onChange={(e) =>
                  updateBusiness({ businessName: e.target.value })
                }
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Business category
                </label>
                <select
                  value={data.business.category}
                  onChange={(e) =>
                    updateBusiness({
                      category: e.target
                        .value as WizardFormData["business"]["category"],
                    })
                  }
                  className="w-full rounded-lg border border-[#222222] bg-[#111111] px-4 py-2.5 text-white focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Business hours
                </label>
                <div className="space-y-2 rounded-lg border border-[#222222] bg-black/30 p-3">
                  {DAYS.map((day) => {
                    const schedule = data.business.hours[day];
                    return (
                      <div
                        key={day}
                        className="flex flex-wrap items-center gap-2 border-b border-[#222222]/60 pb-2 last:border-0 last:pb-0 sm:flex-nowrap"
                      >
                        <span className="w-24 shrink-0 text-sm text-gray-300">
                          {DAY_LABELS[day]}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <input
                            type="checkbox"
                            checked={schedule.closed}
                            onChange={(e) =>
                              updateDaySchedule(day, {
                                closed: e.target.checked,
                              })
                            }
                            className="accent-[#f97316]"
                          />
                          Closed
                        </label>
                        {!schedule.closed && (
                          <>
                            <input
                              type="time"
                              value={schedule.open}
                              onChange={(e) =>
                                updateDaySchedule(day, { open: e.target.value })
                              }
                              className="rounded-md border border-[#222222] bg-[#111111] px-2 py-1 text-sm text-white"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={schedule.close}
                              onChange={(e) =>
                                updateDaySchedule(day, { close: e.target.value })
                              }
                              className="rounded-md border border-[#222222] bg-[#111111] px-2 py-1 text-sm text-white"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Services offered
                </label>
                <textarea
                  value={data.business.services}
                  onChange={(e) =>
                    updateBusiness({ services: e.target.value })
                  }
                  rows={4}
                  placeholder="List your main services, e.g. cleanings, whitening, emergency care..."
                  className="w-full resize-y rounded-lg border border-[#222222] bg-[#111111] px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                />
              </div>

              <Input
                label="Business location / address"
                placeholder="123 Main St, Austin, TX 78701"
                value={data.business.location}
                onChange={(e) => updateBusiness({ location: e.target.value })}
              />

              <Input
                label="Business phone number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={data.business.phone}
                onChange={(e) => updateBusiness({ phone: e.target.value })}
              />
            </div>
          )}

          {/* Step 3 — Voice Agent Settings */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Voice Agent settings
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Configure how your agent sounds and handles calls.
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
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Response tone
                </label>
                <select
                  value={data.voice.tone}
                  onChange={(e) =>
                    updateVoice({
                      tone: e.target.value as WizardFormData["voice"]["tone"],
                    })
                  }
                  className="w-full rounded-lg border border-[#222222] bg-[#111111] px-4 py-2.5 text-white focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                >
                  {VOICE_TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
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

          {/* Step 4 — Review */}
          {step === 3 && (
            <div>
              <h2 className="mb-2 text-xl font-bold text-white">
                Review & go live
              </h2>
              <p className="mb-6 text-sm text-gray-400">
                Confirm everything looks correct before launching your Voice
                Agent.
              </p>

              <dl className="space-y-4 rounded-lg border border-[#222222] bg-black/30 p-4">
                <ReviewSection title="Agent">
                  <ReviewRow
                    label="Type"
                    value={selectedAgent?.name ?? "Voice Agent"}
                  />
                </ReviewSection>

                <ReviewSection title="Business">
                  <ReviewRow
                    label="Name"
                    value={data.business.businessName}
                  />
                  <ReviewRow
                    label="Category"
                    value={data.business.category}
                  />
                  <ReviewRow
                    label="Phone"
                    value={data.business.phone}
                  />
                  <ReviewRow
                    label="Location"
                    value={data.business.location}
                  />
                  <ReviewRow
                    label="Services"
                    value={data.business.services}
                  />
                  <div>
                    <dt className="text-sm text-gray-500">Hours</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm font-medium text-white">
                      {formatWeekSchedule(data.business.hours)}
                    </dd>
                  </div>
                </ReviewSection>

                <ReviewSection title="Voice settings">
                  <ReviewRow
                    label="Agent name"
                    value={data.voice.agentName}
                  />
                  <ReviewRow label="Tone" value={data.voice.tone} />
                  <ReviewRow
                    label="Forward to"
                    value={data.voice.forwardTo || "Not set"}
                  />
                </ReviewSection>
              </dl>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between gap-4 border-t border-[#222222] pt-6">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0 || saving}>
              Back
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed() || saving}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            ) : (
              <Button onClick={handleLaunch} disabled={saving}>
                {saving ? "Launching..." : "Go live"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#222222]/60 pb-4 last:border-0 last:pb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#f97316]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-white">{value || "—"}</dd>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">
          Loading wizard...
        </div>
      }
    >
      <WizardContent />
    </Suspense>
  );
}
