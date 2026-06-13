import { SidebarProvider } from "@/components/dashboard/SidebarContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ContentShift } from "@/components/dashboard/ContentShift";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <div className="dashboard-backdrop" aria-hidden />
        <div className="relative z-10">
          <Sidebar />
          <ContentShift>{children}</ContentShift>
        </div>
      </div>
    </SidebarProvider>
  );
}
