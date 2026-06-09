import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const db = adminSupabase();

  // Fetch profiles (with optional search)
  let profilesQuery = db
    .from("profiles")
    .select("id, full_name, email, username, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q.trim()) {
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,username.ilike.%${q.trim()}%`,
    );
  }

  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    profilesQuery,
    db.from("subscriptions").select("user_id, plan, status"),
  ]);

  // Index subscriptions by user_id
  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.user_id, s]),
  );

  const users = (profiles ?? []).map((p) => ({
    ...p,
    subscription: subMap.get(p.id) ?? null,
  }));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex min-h-[60px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-8"
        style={{
          background: "rgba(10, 10, 10, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div>
          <h1
            className="text-base font-semibold text-white sm:text-lg font-[Outfit]"
            style={{ letterSpacing: "-0.015em" }}
          >
            All Users
          </h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {users.length} user{users.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold font-[Outfit]"
          style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
        >
          Admin
        </span>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        <form method="GET" className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or username…"
              className="flex-1 rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
              style={{
                background: "#161616",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(232,123,44,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <button
              type="submit"
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 font-[Outfit]"
              style={{ background: "#E87B2C" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#C4611A")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#E87B2C")}
            >
              Search
            </button>
            {q && (
              <a
                href="/admin/users"
                className="flex items-center rounded-lg px-4 py-2.5 text-sm transition-colors font-[Outfit]"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Clear
              </a>
            )}
          </div>
        </form>

        {/* Table */}
        {users.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-lg font-medium text-white font-[Outfit]">No users found</p>
            {q && (
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                No results for &ldquo;{q}&rdquo;. Try a different search.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div
              className="hidden rounded-2xl md:block overflow-hidden"
              style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Name", "Email", "Username", "Plan", "Status", "Joined"].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider font-[Outfit]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{u.full_name || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                          {u.email}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                          @{u.username}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.subscription ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize font-[Outfit]"
                            style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
                          >
                            {u.subscription.plan}
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium font-[Outfit]"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            Free
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.subscription ? (
                          <span
                            className={[
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              u.subscription.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-yellow-500/10 text-yellow-400",
                            ].join(" ")}
                          >
                            {u.subscription.status}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {formatDate(u.created_at)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-2 md:hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl px-4 py-4"
                  style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{u.full_name || "—"}</p>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {u.email}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        @{u.username}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {u.subscription ? (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize font-[Outfit]"
                          style={{ background: "rgba(232,123,44,0.1)", color: "#E87B2C" }}
                        >
                          {u.subscription.plan}
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium font-[Outfit]"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          Free
                        </span>
                      )}
                      <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {formatDate(u.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
