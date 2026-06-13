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
  DEFAULT_LEAVE_TYPES,
  HR_WIZARD_STEPS,
  MARKETING_TONES,
  MARKETING_WIZARD_STEPS,
  POST_FREQUENCIES,
  SOCIAL_PLATFORMS,
  TIMEZONES,
  VOICE_TONES,
  WIZARD_STEPS,
  createInitialWizardData,
  formatWeekSchedule,
  type DayKey,
  type HRSettings,
  type MarketingSettings,
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
  const [micModalOpen, setMicModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState<string | null>(null);
  const vapiRef = useRef<import("@vapi-ai/web").default | null>(null);

  // HR-specific state
  const [hrUploadedFiles, setHrUploadedFiles] = useState<string[]>([]);
  const [hrUploading, setHrUploading] = useState(false);
  const [hrSessionId, setHrSessionId] = useState<string | null>(null);
  const hrFileRef = useRef<HTMLInputElement>(null);

  // OTP verification state for "Forward calls to" field
  const [pendingForwardTo, setPendingForwardTo] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Marketing-specific state
  const [marketingSessionId, setMarketingSessionId] = useState<string | null>(null);

  const selectedAgent = data.agentType ? getAgentById(data.agentType) : null;
  const isHR = data.agentType === "hr";
  const isMarketing = data.agentType === "marketing";
  const currentSteps = isHR ? HR_WIZARD_STEPS : isMarketing ? MARKETING_WIZARD_STEPS : WIZARD_STEPS;

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

  const updateHR = useCallback(
    (partial: Partial<HRSettings>) => {
      setData((prev) => ({ ...prev, hr: { ...prev.hr, ...partial } }));
    },
    []
  );

  const updateMarketing = useCallback(
    (partial: Partial<MarketingSettings>) => {
      setData((prev) => ({ ...prev, marketing: { ...prev.marketing, ...partial } }));
    },
    []
  );

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      const agentToLoad = validPreselect ?? "voice";
      const saved = await loadWizardProgress(supabase, user.id, agentToLoad);
      if (saved && !isNew) {
        setData(saved.data);
        if (saved.data.agentType === "voice") {
          // Restore vapiPhoneNumberId from persisted voice_settings
          const savedVapiId = (saved.data.voice as unknown as Record<string, unknown>)
            .vapiPhoneNumberId as string | undefined;
          if (savedVapiId) setVapiPhoneNumberId(savedVapiId);
        }
        // Bug 2: Load HR knowledge base files so they appear on reconfigure and review
        if (saved.data.agentType === "hr") {
          const { data: hrSess } = await supabase
            .from("agent_wizard_sessions")
            .select("id")
            .eq("user_id", user.id)
            .eq("agent_type", "hr")
            .maybeSingle();
          const hrSessId = (hrSess as { id?: string } | null)?.id;
          if (hrSessId) {
            const { data: kbRows } = await supabase
              .from("hr_knowledge_base")
              .select("filename")
              .eq("agent_id", hrSessId);
            if (kbRows?.length) {
              setHrUploadedFiles(kbRows.map((r: { filename: string }) => r.filename));
            }
          }
        }
        if (saved.status === "live" && !reconfigure) {
          if (saved.data.agentType === "hr") {
            const { data: sessionRow } = await supabase
              .from("agent_wizard_sessions")
              .select("id")
              .eq("user_id", user.id)
              .eq("agent_type", "hr")
              .maybeSingle();
            setHrSessionId((sessionRow as { id?: string } | null)?.id ?? null);
          } else if (saved.data.agentType === "marketing") {
            const { data: sessionRow } = await supabase
              .from("agent_wizard_sessions")
              .select("id")
              .eq("user_id", user.id)
              .eq("agent_type", "marketing")
              .maybeSingle();
            setMarketingSessionId((sessionRow as { id?: string } | null)?.id ?? null);
          } else {
            setLaunchSummary({
              agentName: saved.data.voice.agentName.trim(),
              businessName: saved.data.business.businessName.trim(),
              phoneNumber: saved.data.voice.phoneNumber || "",
            });
          }
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

  // Bug 3: Initialise OTP verified state once wizard data finishes loading
  useEffect(() => {
    if (!loading && data.voice.forwardTo) {
      setPendingForwardTo(data.voice.forwardTo);
      setOtpVerified(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
        if (isHR) {
          return (
            data.business.businessName.trim().length >= 2 &&
            data.hr.approverEmail.trim().includes("@")
          );
        }
        if (isMarketing) {
          return data.business.businessName.trim().length >= 2;
        }
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
        if (isHR) return true;
        if (isMarketing) return data.marketing.platforms.length > 0;
        return data.voice.agentName.trim().length >= 2;
      case 3:
        return true;
      case 4:
        return true;
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
      const res = await fetch("/api/phone/provision-number", { method: "POST" });
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

  async function handleHRLaunch() {
    if (!userId) { setSaveError("Not authenticated"); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await saveWizardProgress(supabase, userId, data, step, "live");
      if (error) { setSaveError(error); return; }
      const { data: sessionRow } = await supabase
        .from("agent_wizard_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("agent_type", "hr")
        .maybeSingle();
      setHrSessionId((sessionRow as { id?: string } | null)?.id ?? null);
      setLaunched(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to launch HR Agent");
    } finally {
      setSaving(false);
    }
  }

  async function handleHRFileUpload(file: File) {
    setHrUploading(true);
    setSaveError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/hr/upload-knowledge", { method: "POST", body: fd });
      const result = await res.json() as { success?: boolean; error?: string; filename?: string };
      if (!res.ok || !result.success) {
        setSaveError(result.error ?? "Upload failed");
      } else {
        setHrUploadedFiles((prev) => [...prev, result.filename ?? file.name]);
      }
    } catch {
      setSaveError("Upload failed. Please try again.");
    } finally {
      setHrUploading(false);
      if (hrFileRef.current) hrFileRef.current.value = "";
    }
  }

  async function handleSendOtp() {
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: pendingForwardTo }),
      });
      const result = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !result.success) {
        setOtpError(result.error ?? "Failed to send OTP. Please try again.");
      } else {
        setOtpSent(true);
      }
    } catch {
      setOtpError("Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: pendingForwardTo, code: otpCode }),
      });
      const result = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !result.success) {
        setOtpError(result.error ?? "Invalid or expired code. Please try again.");
      } else {
        updateVoice({ forwardTo: pendingForwardTo });
        setOtpVerified(true);
        setOtpCode("");
      }
    } catch {
      setOtpError("Verification failed. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleMarketingLaunch() {
    if (!userId) { setSaveError("Not authenticated"); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await saveWizardProgress(supabase, userId, data, step, "live");
      if (error) { setSaveError(error); return; }
      const { data: sessionRow } = await supabase
        .from("agent_wizard_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("agent_type", "marketing")
        .maybeSingle();
      setMarketingSessionId((sessionRow as { id?: string } | null)?.id ?? null);
      setLaunched(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to launch Marketing Agent");
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunch() {
    if (isMarketing) { await handleMarketingLaunch(); return; }
    if (isHR) { await handleHRLaunch(); return; }
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

  async function startVapiCall() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setSaveError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing from the build. Redeploy after adding it to Vercel environment variables.");
      return;
    }

    // Diagnostic: log the first/last 4 chars so you can verify this matches your Vapi public key
    console.log("[vapi] Using public key:", publicKey.slice(0, 4) + "…" + publicKey.slice(-4));

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
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }

      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        console.log("[vapi] Call started — assistantId:", assistantId);
        setTestCallConnecting(false);
        setTestCallActive(true);
      });
      vapi.on("call-end", () => {
        console.log("[vapi] Call ended");
        setTestCallActive(false);
        setTestCallConnecting(false);
        vapiRef.current = null;
      });
      vapi.on("speech-start", () => { console.log("[vapi] AI speaking"); });
      vapi.on("speech-end", () => { console.log("[vapi] AI stopped speaking"); });
      vapi.on("message", (msg: unknown) => { console.log("[vapi] Message:", msg); });
      vapi.on("error", (err: unknown) => {
        console.error("[vapi] Error:", err);
        setTestCallActive(false);
        setTestCallConnecting(false);
        vapiRef.current = null;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Test call encountered an error.";
        setSaveError(msg);
      });

      console.log("[vapi] Starting call — assistantId:", assistantId, "| public key prefix:", publicKey.slice(0, 8));
      await vapi.start(assistantId);
      setTestCallConnecting(false);
    } catch (err) {
      vapiRef.current = null;
      setTestCallConnecting(false);
      setSaveError(err instanceof Error ? err.message : "Failed to start test call.");
    }
  }

  async function handleTestCall() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setSaveError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set — test calls require a Vapi public key.");
      return;
    }

    // End active call
    if (testCallActive || testCallConnecting) {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setTestCallActive(false);
      setTestCallConnecting(false);
      return;
    }

    // Check current microphone permission status
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        // Permission already granted — start immediately
        await startVapiCall();
      } else {
        // 'prompt' or 'denied' — show the permission modal
        setMicModalOpen(true);
      }
    } catch {
      // permissions.query not supported (some browsers) — fall back to direct request
      setMicModalOpen(true);
    }
  }

  async function handleRequestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicModalOpen(false);
      await startVapiCall();
    } catch {
      setMicModalOpen(false);
      setSaveError("Microphone access denied. Please allow it in your browser settings to test calls.");
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

  if (launched && isHR) {
    const chatUrl = hrSessionId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/hr-chat/${hrSessionId}`
      : "";
    const embedCode = chatUrl
      ? `<iframe\n  src="${chatUrl}"\n  width="420"\n  height="640"\n  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"\n></iframe>`
      : "";
    return (
      <>
        <DashboardNavbar title="Setup Wizard" />
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-xl p-8"
            style={{ background: "var(--card-elevated)", border: "1px solid rgba(255,122,26,0.3)", boxShadow: "0 0 40px rgba(232,123,44,0.08)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }} />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: "rgba(34,197,94,0.1)", boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}>
              ✓
            </div>
            <h2 className="font-heading text-2xl font-bold text-white">HR Agent is live!</h2>
            <p className="mt-2 mb-6 text-[#888]">
              {data.hr.agentName || "Your HR Assistant"} is ready for {data.business.businessName || "your company"}.
            </p>
            {chatUrl && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="truncate text-sm text-[#888]">{chatUrl}</p>
                  <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="ml-3 shrink-0 text-xs text-[var(--accent)] underline">Open ↗</a>
                </div>
                {embedCode && (
                  <div className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="mb-1.5 text-xs text-[#888]">Embed code</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-[#666]">{embedCode}</pre>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/hr">Go to HR Dashboard</Button>
              <Button href="/agents" variant="secondary">View agents</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (launched && isMarketing) {
    return (
      <>
        <DashboardNavbar title="Setup Wizard" />
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-xl p-8"
            style={{ background: "var(--card-elevated)", border: "1px solid rgba(255,122,26,0.3)", boxShadow: "0 0 40px rgba(232,123,44,0.08)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light), transparent)" }} />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: "rgba(34,197,94,0.1)", boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}>
              ✓
            </div>
            <h2 className="font-heading text-2xl font-bold text-white">Marketing Agent is live!</h2>
            <p className="mt-2 mb-6 text-[#888]">
              {data.marketing.brandTone} content for {data.business.businessName || "your brand"} is ready to generate.
            </p>
            <div className="mb-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs text-[#888] mb-2">Platforms configured</p>
              <div className="flex flex-wrap gap-2">
                {data.marketing.platforms.length > 0
                  ? data.marketing.platforms.map((p) => (
                      <span key={p} className="rounded-full px-3 py-1 text-xs font-semibold capitalize" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,122,26,0.2)" }}>{p}</span>
                    ))
                  : <span className="text-xs text-[#666]">None selected</span>
                }
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/marketing">Go to Marketing Dashboard</Button>
              <Button href="/agents" variant="secondary">View agents</Button>
            </div>
          </div>
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
            <h2 className="font-heading text-2xl font-bold text-white">Voice Agent is live!</h2>
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
                <p className="mt-1 font-heading text-lg font-bold text-[var(--accent)]">
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
        subtitle={`Step ${step + 1} of ${currentSteps.length}: ${currentSteps[step] ?? ""}`}
      />

      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <section className="mb-4 flex items-center justify-between px-1">
          <div>
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
              Agent Configuration
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]" style={{ color: "var(--foreground)" }}>
              Setup Wizard
            </h2>
          </div>
          <div className="hidden rounded-full px-3 py-1 text-xs font-medium sm:block" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            {step + 1}/{currentSteps.length}
          </div>
        </section>

        {saveError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {saveError}
          </p>
        )}

        <div className="space-y-4">
          <div
            className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
            style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", boxShadow: "0 16px 40px rgba(0,0,0,0.05)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
                  Setup Flow
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  One step at a time.
                </p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                {Math.round(((step + 1) / currentSteps.length) * 100)}%
              </span>
            </div>

            <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((step + 1) / currentSteps.length) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                  boxShadow: "0 0 8px rgba(232, 123, 44, 0.5)",
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {currentSteps.map((label, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full border px-3 py-2"
                    style={{
                      background: active ? "var(--surface)" : "transparent",
                      borderColor: active ? "rgba(255,122,26,0.22)" : "var(--border)",
                    }}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={
                        active
                          ? { background: "var(--accent)", color: "white" }
                          : done
                            ? { background: "rgba(255,122,26,0.16)", color: "var(--accent)" }
                            : { background: "var(--surface2)", color: "var(--muted)" }
                      }
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
            style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
          >
          {/* ── Step 0 — Choose Agent ─────────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <h2 className="font-heading mb-2 text-xl font-bold tracking-[-0.02em] text-white">
                Choose your agent type
              </h2>
              <p className="mb-5 max-w-xl text-sm leading-6 text-[#888]">
                Pick one agent to continue.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {AGENTS.map((agent) => {
                  const available = AVAILABLE_AGENT_TYPES.includes(agent.id);
                  const selected = data.agentType === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      disabled={!available}
                      onClick={() => selectAgent(agent.id)}
                      className="relative rounded-2xl p-4 text-left transition-all duration-200"
                      style={{
                        background: selected ? "var(--accent-glow)" : "var(--surface)",
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
                      <p className="mt-2 font-heading text-sm font-semibold text-white">{agent.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#888]">{available ? "Select to continue" : "Coming soon"}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 1 — HR: Company Details ─────────────────────────────────── */}
          {step === 1 && isHR && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Company details</h2>
                <p className="mt-1 text-sm text-[#888]">Tell us about your company so the HR Agent can represent you accurately.</p>
              </div>
              <Input
                label="Company name"
                placeholder="Acme Corp"
                value={data.business.businessName}
                onChange={(e) => updateBusiness({ businessName: e.target.value })}
              />
              <Input
                label="HR Agent name"
                placeholder="Alex HR"
                hint="What employees will see in the chat widget"
                value={data.hr.agentName}
                onChange={(e) => updateHR({ agentName: e.target.value })}
              />
              <Input
                label="Approver email"
                type="email"
                placeholder="hr@yourcompany.com"
                hint="Leave requests will be sent to this address"
                value={data.hr.approverEmail}
                onChange={(e) => updateHR({ approverEmail: e.target.value })}
              />
            </div>
          )}

          {/* ── Step 1 — Marketing: Brand Details ───────────────────────────── */}
          {step === 1 && isMarketing && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Brand details</h2>
                <p className="mt-1 text-sm text-[#888]">Tell us about your brand so the AI can generate on-brand content.</p>
              </div>
              <Input
                label="Business / brand name"
                placeholder="Acme Co."
                value={data.business.businessName}
                onChange={(e) => updateBusiness({ businessName: e.target.value })}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-[#aaa]">Brand tone</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MARKETING_TONES.map((tone) => {
                    const sel = data.marketing.brandTone === tone;
                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => updateMarketing({ brandTone: tone })}
                        className="rounded-xl p-3 text-sm font-medium transition-all"
                        style={{
                          background: sel ? "var(--accent-glow)" : "var(--surface)",
                          border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                          color: sel ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {tone}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 — Voice: Business Profile ─────────────────────────────── */}
          {step === 1 && data.agentType === "voice" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Business profile</h2>
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

          {/* ── Step 2 — HR: Upload Policies ─────────────────────────────────── */}
          {step === 2 && isHR && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Upload HR policies</h2>
                <p className="mt-1 text-sm text-[#888]">Upload your employee handbook and HR policy documents so the agent can answer questions accurately.</p>
              </div>
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--surface)", border: "1px dashed var(--border2)" }}
              >
                <input
                  ref={hrFileRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHRFileUpload(f); }}
                />
                <div className="text-center">
                  <span className="text-4xl">📄</span>
                  <p className="mt-3 font-medium text-white">Drop files here or click to upload</p>
                  <p className="mt-1 text-xs text-[#666]">Supported: PDF, DOC, DOCX, TXT · Max 10 MB each</p>
                  <Button
                    onClick={() => hrFileRef.current?.click()}
                    disabled={hrUploading}
                    variant="secondary"
                    size="md"
                    className="mt-4"
                  >
                    {hrUploading ? "Uploading…" : "Choose file"}
                  </Button>
                </div>
              </div>
              {hrUploadedFiles.length > 0 && (
                <ul className="space-y-2">
                  {hrUploadedFiles.map((name, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <span className="text-green-400">✓</span>
                      <span className="text-sm text-white">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-center text-xs text-[#555]">You can skip this step and upload documents later from the HR dashboard.</p>
            </div>
          )}

          {/* ── Step 2 — Marketing: Platform Selection ───────────────────────── */}
          {step === 2 && isMarketing && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Choose platforms</h2>
                <p className="mt-1 text-sm text-[#888]">Select the social media platforms you want to post on.</p>
              </div>
              <div className="space-y-2">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const checked = data.marketing.platforms.includes(platform);
                  const labels: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", twitter: "Twitter / X" };
                  const icons: Record<string, string> = { facebook: "📘", instagram: "📸", linkedin: "💼", twitter: "🐦" };
                  return (
                    <label
                      key={platform}
                      className="flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 transition-all"
                      style={{ background: checked ? "var(--accent-glow)" : "var(--surface)", border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}` }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...data.marketing.platforms, platform]
                            : data.marketing.platforms.filter((p) => p !== platform);
                          updateMarketing({ platforms: next });
                        }}
                        className="accent-[var(--accent)]"
                      />
                      <span className="text-xl">{icons[platform]}</span>
                      <span className="font-medium text-white">{labels[platform]}</span>
                    </label>
                  );
                })}
              </div>
              {data.marketing.platforms.length === 0 && (
                <p className="text-xs text-[#666]">Select at least one platform to continue.</p>
              )}
            </div>
          )}

          {/* ── Step 2 — Voice: Configure Agent ──────────────────────────────── */}
          {step === 2 && data.agentType === "voice" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Configure agent</h2>
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

          {/* ── Step 3 — HR: Leave Types ─────────────────────────────────────── */}
          {step === 3 && isHR && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Set leave types</h2>
                <p className="mt-1 text-sm text-[#888]">Choose which leave types employees can request through the chat widget.</p>
              </div>
              <div className="space-y-2">
                {DEFAULT_LEAVE_TYPES.map((lt) => {
                  const checked = data.hr.leaveTypes.includes(lt);
                  return (
                    <label
                      key={lt}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-all"
                      style={{ background: checked ? "var(--accent-glow)" : "var(--surface)", border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}` }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...data.hr.leaveTypes, lt]
                            : data.hr.leaveTypes.filter((t) => t !== lt);
                          updateHR({ leaveTypes: types });
                        }}
                        className="accent-[var(--accent)]"
                      />
                      <span className="text-sm font-medium text-white">{lt}</span>
                    </label>
                  );
                })}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-[#aaa]">Custom leave type (optional)</p>
                <div className="flex gap-2">
                  <input
                    id="custom-leave-input"
                    type="text"
                    placeholder="e.g. Study Leave"
                    style={{ flex: 1, background: "var(--card-elevated)", border: "1px solid var(--border2)", color: "var(--foreground)", padding: "10px 16px", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !data.hr.leaveTypes.includes(val)) {
                          updateHR({ leaveTypes: [...data.hr.leaveTypes, val] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      const input = document.getElementById("custom-leave-input") as HTMLInputElement | null;
                      const val = input?.value.trim();
                      if (val && !data.hr.leaveTypes.includes(val)) {
                        updateHR({ leaveTypes: [...data.hr.leaveTypes, val] });
                        if (input) input.value = "";
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              {data.hr.leaveTypes.some((t) => !DEFAULT_LEAVE_TYPES.includes(t as typeof DEFAULT_LEAVE_TYPES[number])) && (
                <div className="space-y-1">
                  <p className="text-xs text-[#888]">Custom types:</p>
                  {data.hr.leaveTypes
                    .filter((t) => !DEFAULT_LEAVE_TYPES.includes(t as typeof DEFAULT_LEAVE_TYPES[number]))
                    .map((t) => (
                      <div key={t} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="text-sm text-white">{t}</span>
                        <button
                          type="button"
                          onClick={() => updateHR({ leaveTypes: data.hr.leaveTypes.filter((lt) => lt !== t) })}
                          className="text-xs text-[#555] hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 — Marketing: Frequency & Topics ───────────────────────── */}
          {step === 3 && isMarketing && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Frequency &amp; topics</h2>
                <p className="mt-1 text-sm text-[#888]">Set how often you want to post and what topics you cover.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#aaa]">Posting frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {POST_FREQUENCIES.map((freq) => {
                    const sel = data.marketing.frequency === freq;
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => updateMarketing({ frequency: freq })}
                        className="rounded-xl p-3 text-sm font-medium transition-all"
                        style={{
                          background: sel ? "var(--accent-glow)" : "var(--surface)",
                          border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                          color: sel ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {freq}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Content topics (optional)</label>
                <p className="mb-2 text-xs text-[#666]">Add topics the AI should focus on when generating posts.</p>
                <div className="flex gap-2">
                  <input
                    id="topic-input"
                    type="text"
                    placeholder="e.g. New products, Tips, Behind the scenes"
                    style={{ flex: 1, background: "var(--card-elevated)", border: "1px solid var(--border2)", color: "var(--foreground)", padding: "10px 16px", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !data.marketing.topics.includes(val)) {
                          updateMarketing({ topics: [...data.marketing.topics, val] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("topic-input") as HTMLInputElement | null;
                      const val = input?.value.trim();
                      if (val && !data.marketing.topics.includes(val)) {
                        updateMarketing({ topics: [...data.marketing.topics, val] });
                        if (input) input.value = "";
                      }
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Add
                  </button>
                </div>
                {data.marketing.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.marketing.topics.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(255,122,26,0.2)" }}
                      >
                        {t}
                        <button type="button" onClick={() => updateMarketing({ topics: data.marketing.topics.filter((x) => x !== t) })} className="text-[#666] hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3 — Voice: Connect Calendar ─────────────────────────────── */}
          {step === 3 && data.agentType === "voice" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Connect Google Calendar</h2>
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
                    <p className="font-heading font-semibold text-white">Calendar connected</p>
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

          {/* ── Step 4 — HR: Go Live ─────────────────────────────────────────── */}
          {step === 4 && isHR && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Review & go live</h2>
                <p className="mt-1 text-sm text-[#888]">Confirm your HR Agent setup and launch.</p>
              </div>
              <dl
                className="space-y-4 rounded-lg p-4"
                style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="pb-3" style={{ borderBottom: "1px solid var(--surface2)" }}>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">Company</h3>
                  <div className="flex justify-between text-sm"><dt className="text-[#888]">Name</dt><dd className="font-medium text-white">{data.business.businessName || "—"}</dd></div>
                </div>
                <div className="pb-3" style={{ borderBottom: "1px solid var(--surface2)" }}>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">HR Agent</h3>
                  <div className="flex justify-between text-sm"><dt className="text-[#888]">Agent name</dt><dd className="font-medium text-white">{data.hr.agentName || "—"}</dd></div>
                  <div className="mt-1 flex justify-between text-sm"><dt className="text-[#888]">Approver email</dt><dd className="font-medium text-white">{data.hr.approverEmail || "—"}</dd></div>
                </div>
                <div>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">Leave Types</h3>
                  <dd className="text-sm font-medium text-white">{data.hr.leaveTypes.join(", ") || "—"}</dd>
                </div>
              </dl>
              {hrUploadedFiles.length > 0 && (
                <div className="rounded-lg px-4 py-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <p className="text-sm text-[#888]">{hrUploadedFiles.length} document{hrUploadedFiles.length !== 1 ? "s" : ""} uploaded to knowledge base</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 — Marketing: Review & Go Live ─────────────────────────── */}
          {step === 4 && isMarketing && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Review &amp; go live</h2>
                <p className="mt-1 text-sm text-[#888]">Confirm your Marketing Agent setup and launch.</p>
              </div>
              <dl className="space-y-4 rounded-lg p-4" style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
                <div className="pb-3" style={{ borderBottom: "1px solid var(--surface2)" }}>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">Brand</h3>
                  <div className="flex justify-between text-sm"><dt className="text-[#888]">Name</dt><dd className="font-medium text-white">{data.business.businessName || "—"}</dd></div>
                  <div className="mt-1 flex justify-between text-sm"><dt className="text-[#888]">Tone</dt><dd className="font-medium text-white">{data.marketing.brandTone}</dd></div>
                  <div className="mt-1 flex justify-between text-sm"><dt className="text-[#888]">Frequency</dt><dd className="font-medium text-white">{data.marketing.frequency}</dd></div>
                </div>
                <div className="pb-3" style={{ borderBottom: "1px solid var(--surface2)" }}>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">Platforms</h3>
                  <dd className="font-medium capitalize text-white">{data.marketing.platforms.join(", ") || "—"}</dd>
                </div>
                <div>
                  <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">Topics</h3>
                  <dd className="font-medium text-white">{data.marketing.topics.join(", ") || "None set — AI will choose based on your brand"}</dd>
                </div>
              </dl>
              <div className="rounded-lg p-4" style={{ background: "rgba(255,122,26,0.04)", border: "1px solid rgba(255,122,26,0.12)" }}>
                <p className="text-xs text-[#888]">
                  <span className="font-medium text-[var(--accent)]">Note: </span>
                  Actual publishing requires OAuth approval from each platform. Use the Marketing Dashboard to generate, review, and schedule posts — publishing integration coming soon.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4 — Voice: Phone Number ─────────────────────────────────── */}
          {step === 4 && data.agentType === "voice" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Connect a phone number</h2>
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
                      <p className="mt-2 font-heading font-semibold text-white">{label}</p>
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
                        <p className="mt-0.5 font-heading text-xl font-bold text-white">
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
              <h2 className="font-heading mb-2 text-xl font-bold text-white">
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

              {/* Microphone permission modal */}
              {micModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                >
                  <div
                    className="w-full max-w-sm rounded-2xl p-6"
                    style={{ background: "var(--card)", border: "1px solid var(--border2)", boxShadow: "var(--shadow-card-hover)" }}
                  >
                    {/* Icon */}
                    <div
                      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.20)" }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </div>

                    <h3
                      className="mb-2 text-center text-base font-bold"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}
                    >
                      Microphone Access Required
                    </h3>
                    <p className="mb-4 text-center text-sm" style={{ color: "var(--muted)" }}>
                      To test your AI agent, please allow microphone access when your browser asks.
                    </p>

                    {/* Browser instructions */}
                    <div
                      className="mb-5 space-y-2 rounded-xl p-3"
                      style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
                    >
                      <p className="text-xs font-medium" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                        Browser instructions:
                      </p>
                      <p className="text-xs" style={{ color: "var(--foreground)" }}>
                        <span className="font-semibold">Chrome:</span> Click the 🎥 icon in the address bar → Allow
                      </p>
                      <p className="text-xs" style={{ color: "var(--foreground)" }}>
                        <span className="font-semibold">Firefox:</span> Click the microphone icon in the address bar → Allow
                      </p>
                      <p className="text-xs" style={{ color: "var(--foreground)" }}>
                        <span className="font-semibold">Safari:</span> Safari menu → Settings for This Website → Microphone → Allow
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                        style={{ background: "var(--card2)", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-sans)" }}
                        onClick={() => setMicModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-all"
                        style={{ background: "var(--accent)", fontFamily: "var(--font-sans)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
                        onClick={handleRequestMicPermission}
                      >
                        Request Permission
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Call */}
              <div
                className="mb-6 rounded-xl p-5"
                style={{ background: "rgba(255,122,26,0.04)", border: "1px solid rgba(255,122,26,0.15)" }}
              >
                <p className="mb-1 font-heading font-semibold text-white">Test your agent</p>
                <p className="mb-1 text-sm text-[#888]">
                  Have a live conversation with your AI Receptionist before going live.
                </p>
                <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
                  Test calls use minimal credits (~$0.05-0.10 per minute)
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
            {step < currentSteps.length - 1 ? (
              <div className="flex items-center gap-3">
                {((isHR && step === 2) || (isMarketing && step === 3) || (data.agentType === "voice" && (step === 3 || step === 4))) && (
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
      </div>
    </>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4 last:pb-0" style={{ borderBottom: "1px solid var(--surface2)" }}>
      <h3 className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-[3px] text-[var(--accent)]">
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
