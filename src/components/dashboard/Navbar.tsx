"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";
import { getFirstName, getInitials } from "@/lib/types/profile";
import type { User } from "@supabase/supabase-js";

interface DashboardNavbarProps {
  title: string;
  subtitle?: string;
}

export function DashboardNavbar({ title, subtitle }: DashboardNavbarProps) {
  const { profile, loading: profileLoading } = useProfile();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  function clearAuthCookies() {
    const cookieNames = document.cookie
      .split(";")
      .map((c) => c.split("=")[0]?.trim())
      .filter(Boolean);

    for (const name of cookieNames) {
      if (!name.startsWith("sb-")) continue;

      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }
  }

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut({ scope: "global" });
    clearAuthCookies();

    window.location.href = "/login";
  }

  const displayName = profile
    ? getFirstName(profile.full_name)
    : user?.email?.split("@")[0] ?? "there";
  const initials = profile
    ? getInitials(profile.full_name)
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "?";

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-[#222222] bg-black/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>
        )}
        {!profileLoading && profile && (
          <p className="mt-0.5 text-xs text-[#f97316] sm:hidden">
            Hi, {displayName}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {!profileLoading && (profile || user) && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">
                {profile?.full_name ?? user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {profile ? `@${profile.username}` : user?.email}
              </p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 text-sm font-bold text-[#f97316]"
              title={profile?.full_name ?? user?.email ?? "Account"}
            >
              {initials}
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
