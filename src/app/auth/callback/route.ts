export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { welcomeHtml } from "@/lib/email/templates/welcome";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Safety net: DB trigger handles new users, but create the profile here
        // in case it was missed (e.g. trigger not yet applied, or username conflict resolved differently).
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        const { data: existingProfile } = await adminSupabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const email = user.email ?? "";
          const localPart = email.split("@")[0];
          // e.g. john.doe@gmail.com → john_doe
          const baseUsername = localPart
            .replace(/\./g, "_")
            .replace(/[^a-z0-9_]/gi, "")
            .toLowerCase();

          const fullName =
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            localPart;

          // Try base username; fall back to base + uid prefix on conflict
          const { error: insertError } = await adminSupabase
            .from("profiles")
            .insert({
              id: user.id,
              username: baseUsername,
              full_name: fullName,
              email,
            });

          if (insertError?.code === "23505") {
            // Unique violation on username — append uid prefix
            await adminSupabase.from("profiles").insert({
              id: user.id,
              username: `${baseUsername}_${user.id.slice(0, 8)}`,
              full_name: fullName,
              email,
            });
          }

          // Welcome email for newly created profiles (don't block redirect on failure)
          if (email) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
            sendEmail(
              email,
              "Welcome to CodeFounder!",
              welcomeHtml({
                name: fullName || baseUsername,
                dashboardUrl: `${siteUrl}/dashboard`,
              }),
            ).catch((err) =>
              console.error("[auth/callback] welcome email failed:", err),
            );
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
