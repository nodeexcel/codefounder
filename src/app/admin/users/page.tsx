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
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#222222] bg-black/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            All Users
          </h1>
          <p className="text-xs text-gray-500">
            {users.length} user{users.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <span className="rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-semibold text-[#f97316]">
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
              className="flex-1 rounded-lg border border-[#222222] bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#f97316] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#f97316] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea580c]"
            >
              Search
            </button>
            {q && (
              <a
                href="/admin/users"
                className="flex items-center rounded-lg border border-[#222222] px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                Clear
              </a>
            )}
          </div>
        </form>

        {/* Table */}
        {users.length === 0 ? (
          <div className="rounded-xl border border-[#222222] bg-[#111111] py-16 text-center">
            <p className="text-lg font-medium text-white">No users found</p>
            {q && (
              <p className="mt-2 text-sm text-gray-400">
                No results for &ldquo;{q}&rdquo;. Try a different search.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden rounded-xl border border-[#222222] bg-[#111111] md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222222]">
                    {["Name", "Email", "Username", "Plan", "Status", "Joined"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#161616]">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">
                          {u.full_name || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-300">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-400">
                          @{u.username}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.subscription ? (
                          <span className="rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-medium capitalize text-[#f97316]">
                            {u.subscription.plan}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#222222] px-2.5 py-0.5 text-xs font-medium text-gray-500">
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
                                ? "bg-green-500/10 text-green-400"
                                : "bg-yellow-500/10 text-yellow-400",
                            ].join(" ")}
                          >
                            {u.subscription.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-500">
                          {formatDate(u.created_at)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-3 md:hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-[#222222] bg-[#111111] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {u.full_name || "—"}
                      </p>
                      <p className="text-sm text-gray-400">{u.email}</p>
                      <p className="text-xs text-gray-600">@{u.username}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {u.subscription ? (
                        <span className="rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-medium capitalize text-[#f97316]">
                          {u.subscription.plan}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#222222] px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Free
                        </span>
                      )}
                      <p className="mt-1 text-xs text-gray-600">
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
