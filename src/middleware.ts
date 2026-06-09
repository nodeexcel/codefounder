import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/agents", "/wizard"];

// These pages must never redirect — users need them while unauthenticated
const publicAuthPages = new Set(["/forgot-password", "/reset-password"]);

// Resolved at build time via next.config.ts `env` + .env / .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PROJECT_REF = "toytsqqvpfzpjmcyoriz";

function getProjectRefFromUrl(url: string | undefined): string {
  if (!url) return PROJECT_REF;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? PROJECT_REF;
}

/**
 * Supabase SSR sets: sb-{project-ref}-auth-token
 * Large sessions may be chunked: sb-{project-ref}-auth-token.0, .1, ...
 */
function hasSupabaseAuthCookie(
  request: NextRequest,
  projectRef: string
): boolean {
  const cookieBase = `sb-${projectRef}-auth-token`;

  return request.cookies.getAll().some((cookie) => {
    if (!cookie.value || cookie.value === "null") return false;

    return (
      cookie.name === cookieBase ||
      cookie.name.startsWith(`${cookieBase}.`)
    );
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Password reset pages: always pass through, no redirects
  if (publicAuthPages.has(pathname)) {
    return NextResponse.next({ request });
  }

  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isProtected =
    isAdminPage ||
    protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const projectRef = getProjectRefFromUrl(supabaseUrl);
  const hasAuthCookie = hasSupabaseAuthCookie(request, projectRef);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );

    if (!hasAuthCookie && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (hasAuthCookie && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user || hasAuthCookie;

  if (!isAuthenticated && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Admin authorization (role + email) is enforced in src/app/admin/layout.tsx.
  // The middleware only ensures the user is authenticated before reaching admin routes.

  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/wizard/:path*",
    "/calls/:path*",
    "/admin/:path*",
    "/admin",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
