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
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Sidebar />
        <ContentShift>{children}</ContentShift>
      </div>
    </SidebarProvider>
  );
}
