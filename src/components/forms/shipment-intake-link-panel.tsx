"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";
import { formatDate } from "@/lib/helpers";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

async function fetchWarehouseOptions() {
  const res = await fetch("/api/warehouses/options");
  const json = await res.json();
  return json.success ? json.data : [];
}

function canSelectWarehouse(role: UserRole | undefined) {
  if (!role || role === UserRole.CUSTOMER) return false;
  return (
    hasPermission(role, "warehouses:read") ||
    hasPermission(role, "shipments:write") ||
    hasPermission(role, "shipments:assign")
  );
}

type IntakeLinkResult = {
  url: string;
  expiresAt: string;
  warehouse: { code: string; name: string } | null;
};

export function ShipmentIntakeLinkPanel({
  role,
  onClose,
}: {
  role: UserRole | undefined;
  onClose: () => void;
}) {
  const showWarehouseField = canSelectWarehouse(role);
  const isWarehouseStaff = role === UserRole.WAREHOUSE_STAFF;
  const [warehouseId, setWarehouseId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkResult, setLinkResult] = useState<IntakeLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: fetchWarehouseOptions,
    enabled: showWarehouseField,
  });

  useEffect(() => {
    if (!isWarehouseStaff || !warehouses?.length) return;
    if (warehouses.length === 1) {
      setWarehouseId(warehouses[0].id);
    }
  }, [isWarehouseStaff, warehouses]);

  async function handleGenerate() {
    setIsGenerating(true);
    setCopied(false);
    try {
      const res = await fetch("/api/shipment-intake-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: warehouseId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to generate link");
        return;
      }
      setLinkResult({
        url: json.data.url,
        expiresAt: json.data.expiresAt,
        warehouse: json.data.warehouse,
      });
      toast.success("Intake link generated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!linkResult?.url) return;
    try {
      await navigator.clipboard.writeText(linkResult.url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Generate a secure link and send it to a new customer. They will fill in their contact
            details and shipment information. Each link can be used once and expires in 14 days.
          </p>
        </div>
      </div>

      {showWarehouseField && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="intakeWarehouseId">Warehouse Branch (optional)</Label>
          <select
            id="intakeWarehouseId"
            className={formSelectClass}
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">Assign later</option>
            {warehouses?.map((w: { id: string; code: string; name: string }) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {linkResult ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Share this link</p>
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(linkResult.expiresAt)}
              {linkResult.warehouse
                ? ` · Warehouse: ${linkResult.warehouse.code} — ${linkResult.warehouse.name}`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={linkResult.url}
              className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-2.5 py-2 text-xs"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => void handleCopy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={() => void handleGenerate()} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate new link"
            )}
          </Button>
        </div>
      ) : (
        <Button type="button" className="w-full" onClick={() => void handleGenerate()} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate intake link"
          )}
        </Button>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}
