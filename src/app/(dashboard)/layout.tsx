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
      <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <Sidebar />
        <ContentShift>{children}</ContentShift>
      </div>
    </SidebarProvider>
  );
}
