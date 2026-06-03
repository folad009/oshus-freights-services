import { auth } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dashboardPath = ROLE_DASHBOARD_PATH[session.user.role];
  redirect(dashboardPath);
}
