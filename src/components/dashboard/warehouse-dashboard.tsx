"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  Users,
  Boxes,
  ArrowRight,
  Plus,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog";
import { formatDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeShipments: number;
  delayedShipments: number;
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
  { title: "Customers", href: "/dashboard/customers", description: "Manage customer accounts" },
  { title: "Shipments", href: "/dashboard/shipments", description: "Branch shipment activity" },
  { title: "Inventory", href: "/dashboard/inventory", description: "Stock and warehouse items" },
];

export function WarehouseDashboard() {
  const queryClient = useQueryClient();
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
  });

  async function handleCustomerSuccess() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 2 }).map((_, i) => (
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h1>
          <p className="text-muted-foreground">Branch operations, shipments, and inventory overview</p>
        </div>
        <Button onClick={() => setCustomerFormOpen(true)}>
          <Plus />
          New Customer
        </Button>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
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
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4" />
              Recent Shipments
            </CardTitle>
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

      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSuccess={handleCustomerSuccess}
      />
    </div>
  );
}
