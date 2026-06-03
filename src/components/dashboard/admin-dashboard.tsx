"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  DollarSign,
  FileText,
  Boxes,
  Truck,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/helpers";

interface DashboardStats {
  activeShipments: number;
  delayedShipments: number;
  deliveredShipments: number;
  totalRevenue: number;
  outstandingInvoices: number;
  totalInventory: number;
  lowStockItems: number;
  fleetUtilization: number;
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

interface AdminDashboardProps {
  title?: string;
  showAll?: boolean;
}

export function AdminDashboard({ title = "Admin Dashboard", showAll = true }: AdminDashboardProps) {
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
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">Overview of your logistics operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Shipments"
          value={data.activeShipments}
          icon={Package}
          description="Currently in progress"
        />
        <StatCard
          title="Delayed Shipments"
          value={data.delayedShipments}
          icon={AlertTriangle}
          description="Past estimated delivery"
        />
        {showAll && (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              icon={DollarSign}
              description="All time payments"
            />
            <StatCard
              title="Outstanding Invoices"
              value={data.outstandingInvoices}
              icon={FileText}
              description="Awaiting payment"
            />
            <StatCard
              title="Inventory Units"
              value={data.totalInventory.toLocaleString()}
              icon={Boxes}
              description={`${data.lowStockItems} low stock alerts`}
            />
            <StatCard
              title="Fleet Utilization"
              value={`${data.fleetUtilization}%`}
              icon={Truck}
              description="Vehicles currently in use"
            />
            <StatCard
              title="Delivered"
              value={data.deliveredShipments}
              icon={TrendingUp}
              description="Completed shipments"
            />
          </>
        )}
      </div>

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
                      {shipment.customer.companyName} · {shipment.origin} → {shipment.destination}
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
  );
}
