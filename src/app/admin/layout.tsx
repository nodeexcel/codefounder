import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./_components/AdminSidebar";

export const metadata = { title: "Admin — CodeFounder" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Primary check: role column in profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminByRole = profile?.role === "admin";

  // Fallback: ADMIN_EMAIL env var (for bootstrapping before role is set)
  const isAdminByEmail =
    !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;

  if (!isAdminByRole && !isAdminByEmail) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="lg:pl-64">{children}</div>
      <div className="h-16 lg:hidden" aria-hidden />
    </div>
  );
}
