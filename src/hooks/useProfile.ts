"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types/profile";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          setError(userError.message);
          return;
        }

        if (!user) {
          setProfile(null);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, full_name, email, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message);
          return;
        }

        if (data) {
          setProfile(data as Profile);
          return;
        }

        // Fallback when profiles row missing (legacy accounts)
        setProfile({
          id: user.id,
          username: user.email?.split("@")[0] ?? "user",
          full_name:
            (user.user_metadata?.full_name as string) ||
            user.email?.split("@")[0] ||
            "User",
          email: user.email ?? "",
          created_at: user.created_at,
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return { profile, loading, error };
}
