"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { getFirstName } from "@/lib/types/profile";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function WelcomeBanner() {
  const { profile, loading } = useProfile();
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-52 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    );
  }

  if (!profile) return null;

  const firstName = getFirstName(profile.full_name);

  return (
    <div>
      <h2
        className="text-2xl font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.025em", color: "#fff" }}
      >
        {greeting},{" "}
        <span style={{ color: "#E87B2C" }}>{firstName}!</span>
      </h2>
      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-sans)" }}>
        Here&rsquo;s your Voice Agent performance
      </p>
    </div>
  );
}
