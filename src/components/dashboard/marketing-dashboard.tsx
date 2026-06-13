"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  TrendingUp,
  Users,
  HeadphonesIcon,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeShipments: number;
  deliveredShipments: number;
  totalCustomers: number;
  openSupportTickets: number;
  recentShipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    customer: { companyName: string };
  }>;
}

async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats");
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

const quickLinks = [
  { title: "Customers", href: "/dashboard/customers", description: "View customer accounts" },
  { title: "Reports", href: "/dashboard/reports", description: "Review performance metrics" },
  { title: "Shipments", href: "/dashboard/shipments", description: "Track shipment activity" },
  { title: "Support", href: "/dashboard/support", description: "Monitor customer inquiries" },
];

export function MarketingDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">Failed to load dashboard data.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
        <p className="text-muted-foreground">
          Customer insights, shipment trends, and engagement overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Shipments"
          value={data.activeShipments}
          icon={Package}
          description="Currently in progress"
        />
        <StatCard
          title="Delivered"
          value={data.deliveredShipments}
          icon={TrendingUp}
          description="Completed shipments"
        />
        <StatCard
          title="Customers"
          value={data.totalCustomers}
          icon={Users}
          description="Registered accounts"
        />
        <StatCard
          title="Open Inquiries"
          value={data.openSupportTickets}
          icon={HeadphonesIcon}
          description="Support tickets needing attention"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto justify-between px-4 py-3"
                )}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{link.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentShipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipments yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-sm font-medium">
                        {shipment.trackingNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {shipment.customer.companyName} · {shipment.origin} →{" "}
                        {shipment.destination}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(shipment.createdAt)}
                      </span>
                    </div>
                    <StatusBadge status={shipment.status} type="shipment" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
