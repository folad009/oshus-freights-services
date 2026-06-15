import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardBarcodeScanner } from "@/components/dashboard-barcode-scanner";
import { Separator } from "@/components/ui/separator";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as UserRole;
  const canScanShipments = hasPermission(role, "shipments:read");

  return (
    <SidebarProvider>
      <DashboardBarcodeScanner enabled={canScanShipments} />
      <AppSidebar
        role={session.user.role}
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
      />
      <SidebarInset>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Logistics Management System
            </span>
            <DashboardHeader />
          </div>
        </div>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
