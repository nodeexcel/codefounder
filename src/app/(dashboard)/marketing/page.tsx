"use client";

import { useEffect, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";

type Platform = "facebook" | "instagram" | "linkedin" | "twitter";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

interface SocialPost {
  id: string;
  platform: Platform;
  content: string;
  scheduled_at: string | null;
  published_at: string | null;
  status: PostStatus;
  created_at: string;
}

const PLATFORM_INFO: Record<Platform, { label: string; icon: string; color: string; bg: string }> = {
  facebook:  { label: "Facebook",  icon: "f", color: "#1877f2", bg: "rgba(24,119,242,0.1)" },
  instagram: { label: "Instagram", icon: "ig", color: "#e1306c", bg: "rgba(225,48,108,0.1)" },
  linkedin:  { label: "LinkedIn",  icon: "in", color: "#0a66c2", bg: "rgba(10,102,194,0.1)" },
  twitter:   { label: "Twitter/X", icon: "x",  color: "#000",   bg: "rgba(0,0,0,0.12)" },
};

const STATUS_STYLES: Record<PostStatus, { bg: string; color: string; label: string }> = {
  draft:     { bg: "rgba(156,163,175,0.15)", color: "#9ca3af", label: "Draft" },
  scheduled: { bg: "rgba(234,179,8,0.1)",   color: "#eab308", label: "Scheduled" },
  published: { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", label: "Published" },
  failed:    { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", label: "Failed" },
};

const CARD: React.CSSProperties = {
  background: "var(--card-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "24px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border2)",
  color: "var(--foreground)",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

function PlatformBadge({ platform }: { platform: Platform }) {
  const p = PLATFORM_INFO[platform];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: p.bg, color: p.color }}
    >
      <span className="font-bold uppercase text-[10px]">{p.icon}</span>
      {p.label}
    </span>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// Simple month calendar component
function ContentCalendar({ posts }: { posts: SocialPost[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group posts by day
  const postsByDay: Record<number, SocialPost[]> = {};
  posts.forEach((p) => {
    const dateStr = p.scheduled_at ?? p.published_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(p);
    }
  });

  const selectedPosts = selectedDay ? (postsByDay[selectedDay] ?? []) : [];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null); }}
          className="rounded-lg px-3 py-1.5 text-sm transition-colors"
          style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          ← Prev
        </button>
        <span className="font-heading font-semibold text-white">{monthName}</span>
        <button
          onClick={() => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null); }}
          className="rounded-lg px-3 py-1.5 text-sm transition-colors"
          style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          Next →
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#666]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayPosts = postsByDay[day] ?? [];
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className="relative flex min-h-[52px] flex-col items-center rounded-lg p-1 transition-all"
              style={{
                background: isSelected ? "var(--accent-glow)" : "var(--surface)",
                border: `1px solid ${isSelected ? "var(--accent)" : isToday ? "rgba(255,122,26,0.4)" : "var(--border)"}`,
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: isToday ? "var(--accent)" : "var(--muted)" }}
              >
                {day}
              </span>
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {dayPosts.slice(0, 3).map((p) => (
                  <span
                    key={p.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PLATFORM_INFO[p.platform].color }}
                  />
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[9px] text-[#555]">+{dayPosts.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day posts */}
      {selectedDay !== null && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#888]">
            {selectedPosts.length > 0
              ? `${selectedPosts.length} post${selectedPosts.length !== 1 ? "s" : ""} on ${monthName.split(" ")[0]} ${selectedDay}`
              : `No posts on ${monthName.split(" ")[0]} ${selectedDay}`}
          </p>
          {selectedPosts.map((p) => (
            <div key={p.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="mb-1.5 flex items-center gap-2">
                <PlatformBadge platform={p.platform} />
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-[#ccc] line-clamp-2">{p.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketingPage() {
  const supabase = createClient();

  const [agentReady, setAgentReady] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [brandTone, setBrandTone] = useState("Professional");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"calendar" | "generate" | "posts" | "analytics">("calendar");

  // Posts state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Generate post state
  const [genPlatform, setGenPlatform] = useState<Platform>("instagram");
  const [genTopic, setGenTopic] = useState("");
  const [genTone, setGenTone] = useState("Professional");
  const [genContent, setGenContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Edit post state
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: session } = await supabase
        .from("agent_wizard_sessions")
        .select("id, status, voice_settings, business_details")
        .eq("user_id", user.id)
        .eq("agent_type", "marketing")
        .maybeSingle();

      if (session) {
        setAgentReady(true);
        setIsLive(session.status === "live");
        const settings = session.voice_settings as { brandTone?: string; platforms?: Platform[] } | null;
        const biz = session.business_details as { businessName?: string } | null;
        if (settings?.brandTone) setBrandTone(settings.brandTone);
        if (settings?.platforms?.length) setPlatforms(settings.platforms);
        if (biz?.businessName) setBusinessName(biz.businessName);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!agentReady) return;
    setPostsLoading(true);
    fetch("/api/marketing/posts")
      .then((r) => r.json())
      .then((d: { posts?: SocialPost[] }) => { setPosts(d.posts ?? []); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [agentReady]);

  async function generatePost() {
    if (!genTopic.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGenContent("");
    setScheduleSuccess(false);
    try {
      const res = await fetch("/api/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: genPlatform, topic: genTopic, tone: genTone, businessName }),
      });
      const data = await res.json() as { content?: string; error?: string };
      if (!res.ok || !data.content) { setGenError(data.error ?? "Generation failed"); return; }
      setGenContent(data.content);
    } catch {
      setGenError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function savePost(postStatus: "draft" | "scheduled") {
    if (!genContent.trim()) return;
    setScheduling(true);
    try {
      let scheduledAt: string | null = null;
      if (postStatus === "scheduled" && scheduleDate) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }
      const res = await fetch("/api/marketing/schedule-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: genContent, platform: genPlatform, scheduledAt, status: postStatus }),
      });
      const data = await res.json() as { success?: boolean; error?: string; id?: string };
      if (!res.ok || !data.success) { setGenError(data.error ?? "Save failed"); return; }
      setScheduleSuccess(true);
      // Refresh posts
      const postsRes = await fetch("/api/marketing/posts");
      const postsData = await postsRes.json() as { posts?: SocialPost[] };
      setPosts(postsData.posts ?? []);
      // Reset form after a delay
      setTimeout(() => {
        setGenContent(""); setGenTopic(""); setScheduleDate(""); setScheduleSuccess(false);
      }, 2000);
    } catch {
      setGenError("Save failed. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  async function deletePost(id: string) {
    const res = await fetch(`/api/marketing/posts?id=${id}`, { method: "DELETE" });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveEdit() {
    if (!editingPost || !editContent.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/marketing/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPost.id, content: editContent }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.id === editingPost.id ? { ...p, content: editContent } : p));
        setEditingPost(null);
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function approvePost(id: string) {
    const res = await fetch("/api/marketing/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "scheduled" }),
    });
    if (res.ok) setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: "scheduled" } : p));
  }

  if (loading) {
    return (
      <>
        <DashboardNavbar title="Marketing Agent" />
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[#888]">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          Loading...
        </div>
      </>
    );
  }

  if (!agentReady) {
    return (
      <>
        <DashboardNavbar title="Marketing Agent" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-5xl">📱</span>
          <h2 className="font-heading text-xl font-bold text-white">Marketing Agent not set up</h2>
          <p className="max-w-xs text-sm text-[#888]">Set up your Marketing Agent to start generating and scheduling social media posts.</p>
          <Button href="/wizard?agent=marketing">Set up Marketing Agent →</Button>
        </div>
      </>
    );
  }

  const TABS = [
    { id: "calendar" as const,  label: "📅 Calendar" },
    { id: "generate" as const,  label: "✨ Generate Post" },
    { id: "posts" as const,     label: `📋 Posts${posts.length ? ` (${posts.length})` : ""}` },
    { id: "analytics" as const, label: "📊 Analytics" },
  ];

  const platformsList = (Object.keys(PLATFORM_INFO) as Platform[]);

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const platformCounts = platformsList.reduce<Record<string, number>>((acc, pl) => {
    acc[pl] = posts.filter((p) => p.platform === pl).length;
    return acc;
  }, {});

  return (
    <>
      <DashboardNavbar
        title="Marketing Agent"
        subtitle={isLive ? `${businessName || "Your brand"} — Live` : "Draft"}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Status bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl px-5 py-4"
          style={{ background: isLive ? "rgba(34,197,94,0.05)" : "var(--card-elevated)", border: `1px solid ${isLive ? "rgba(34,197,94,0.25)" : "var(--border)"}` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-heading font-semibold text-white">{businessName || "Marketing Agent"}</p>
              <p className="text-xs text-[#888]">{isLive ? "Your Marketing Agent is active" : "Complete the wizard to go live"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.length > 0 && (
              <div className="flex gap-1">
                {platforms.map((p) => (
                  <span key={p} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: PLATFORM_INFO[p].bg, color: PLATFORM_INFO[p].color }}>
                    {PLATFORM_INFO[p].label}
                  </span>
                ))}
              </div>
            )}
            <Button href="/wizard?agent=marketing&reconfigure=true" variant="ghost" size="sm">
              {isLive ? "Reconfigure" : "Complete setup →"}
            </Button>
          </div>
        </div>

        {/* Platform connect cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {platformsList.map((pl) => {
            const info = PLATFORM_INFO[pl];
            return (
              <div
                key={pl}
                className="rounded-xl p-4 text-center"
                style={{ background: "var(--card-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: info.bg, color: info.color }}>
                  {info.icon.toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-white">{info.label}</p>
                <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-[#666]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  Coming Soon
                </span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg p-1" style={{ background: "var(--surface)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-all"
              style={tab === t.id
                ? { background: "var(--card-elevated)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
                : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Calendar */}
        {tab === "calendar" && (
          <div style={CARD}>
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-white">Content Calendar</h3>
              <p className="mt-0.5 text-sm text-[#888]">All your scheduled and published posts at a glance</p>
            </div>
            <ContentCalendar posts={posts} />
          </div>
        )}

        {/* Generate Post */}
        {tab === "generate" && (
          <div style={CARD}>
            <div className="mb-6">
              <h3 className="font-heading font-semibold text-white">Generate a Post</h3>
              <p className="mt-0.5 text-sm text-[#888]">AI will create a platform-optimised post for you to review and schedule</p>
            </div>

            <div className="space-y-4">
              {/* Platform selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#aaa]">Platform</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {platformsList.map((pl) => {
                    const info = PLATFORM_INFO[pl];
                    const sel = genPlatform === pl;
                    return (
                      <button
                        key={pl}
                        onClick={() => setGenPlatform(pl)}
                        className="flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold transition-all"
                        style={{
                          background: sel ? info.bg : "var(--surface)",
                          border: `1px solid ${sel ? info.color : "var(--border)"}`,
                          color: sel ? info.color : "var(--muted)",
                        }}
                      >
                        <span className="text-xs font-bold uppercase">{info.icon}</span>
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Topic or promotion *</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                  placeholder="e.g. Summer sale — 20% off all services this weekend"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generatePost(); }}
                />
                <p className="mt-1 text-xs text-[#555]">Press ⌘+Enter to generate</p>
              </div>

              {/* Tone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#aaa]">Tone</label>
                <select style={selectStyle} value={genTone} onChange={(e) => setGenTone(e.target.value)}>
                  {["Professional", "Casual", "Playful", "Bold", "Inspirational"].map((t) => (
                    <option key={t} value={t} style={{ background: "var(--card-elevated)" }}>{t}</option>
                  ))}
                </select>
              </div>

              {genError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{genError}</p>
              )}

              <Button onClick={generatePost} disabled={generating || !genTopic.trim()} size="md">
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "white", borderTopColor: "transparent" }} />
                    Generating…
                  </span>
                ) : "✨ Generate post"}
              </Button>

              {/* Generated content */}
              {genContent && (
                <div className="space-y-4 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(255,122,26,0.2)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={genPlatform} />
                      <span className="text-xs text-[#888]">{genContent.length} chars</span>
                    </div>
                    <button onClick={generatePost} disabled={generating} className="text-xs text-[var(--accent)] hover:underline">
                      Regenerate
                    </button>
                  </div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                    value={genContent}
                    onChange={(e) => setGenContent(e.target.value)}
                  />

                  {/* Schedule */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#aaa]">Schedule (optional)</p>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="date"
                        style={{ ...inputStyle, width: "auto", flex: 1 }}
                        value={scheduleDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                      <input
                        type="time"
                        style={{ ...inputStyle, width: "auto" }}
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {scheduleSuccess && (
                    <p className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-400">✓ Post saved successfully!</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => savePost("draft")} variant="secondary" size="md" disabled={scheduling}>
                      Save as draft
                    </Button>
                    <Button onClick={() => savePost("scheduled")} size="md" disabled={scheduling || !scheduleDate}>
                      {scheduling ? "Saving…" : "Approve & Schedule"}
                    </Button>
                  </div>
                  {!scheduleDate && (
                    <p className="text-xs text-[#555]">Set a date above to enable scheduling. Save as draft to review later.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scheduled Posts */}
        {tab === "posts" && (
          <div style={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-white">All Posts</h3>
                <p className="mt-0.5 text-sm text-[#888]">Review, approve, and manage your content</p>
              </div>
              <Button onClick={() => setTab("generate")} size="sm" variant="secondary">+ New post</Button>
            </div>

            {postsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl">📝</span>
                <p className="mt-3 text-sm text-[#888]">No posts yet. Generate your first post to get started.</p>
                <Button onClick={() => setTab("generate")} variant="secondary" size="sm" className="mt-3">Generate post →</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <div key={p.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {editingPost?.id === p.id ? (
                      <div className="space-y-3">
                        <textarea
                          style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} size="sm" disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</Button>
                          <Button onClick={() => setEditingPost(null)} variant="ghost" size="sm">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <PlatformBadge platform={p.platform} />
                          <StatusBadge status={p.status} />
                          {p.scheduled_at && (
                            <span className="text-xs text-[#666]">
                              {new Date(p.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#ccc] whitespace-pre-wrap">{p.content}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {p.status === "draft" && (
                            <button
                              onClick={() => approvePost(p.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
                            >
                              Approve & Schedule
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingPost(p); setEditContent(p.content); }}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium"
                            style={{ background: "var(--card-elevated)", color: "var(--muted)", border: "1px solid var(--border2)" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePost(p.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:text-red-400"
                            style={{ background: "var(--card-elevated)", color: "var(--muted)", border: "1px solid var(--border2)" }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Published",  value: publishedCount,  color: "#22c55e", icon: "✓" },
                { label: "Scheduled",  value: scheduledCount,  color: "#eab308", icon: "⏰" },
                { label: "Drafts",     value: draftCount,      color: "#9ca3af", icon: "📝" },
              ].map((stat) => (
                <div key={stat.label} style={CARD} className="text-center">
                  <div className="text-3xl">{stat.icon}</div>
                  <div className="mt-2 font-heading text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-sm text-[#888]">{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={CARD}>
              <h3 className="mb-4 font-heading font-semibold text-white">Posts by Platform</h3>
              <div className="space-y-3">
                {platformsList.map((pl) => {
                  const count = platformCounts[pl] ?? 0;
                  const max = Math.max(...Object.values(platformCounts), 1);
                  const info = PLATFORM_INFO[pl];
                  return (
                    <div key={pl} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-[#888]">{info.label}</span>
                      <div className="flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface)", height: 8 }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(count / max) * 100}%`, background: info.color }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-semibold text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={CARD}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 text-xl" style={{ background: "rgba(255,122,26,0.1)" }}>🚀</div>
                <div>
                  <p className="font-medium text-white">Engagement analytics coming soon</p>
                  <p className="text-sm text-[#888]">Connect your social accounts to track likes, comments, and reach once OAuth approval is complete.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
