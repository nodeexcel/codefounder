import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Sidebar />
      <div className="lg:pl-64">
        {children}
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </div>
  );
}
