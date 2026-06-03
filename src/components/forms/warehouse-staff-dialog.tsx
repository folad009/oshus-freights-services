"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface WarehouseStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string | null;
  warehouseName?: string;
  onSuccess?: () => void;
}

async function fetchStaff(warehouseId: string) {
  const res = await fetch(`/api/warehouses/${warehouseId}/staff`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as Array<{
    id: string;
    userId: string;
    isManager: boolean;
    user: { id: string; firstName: string; lastName: string; email: string };
  }>;
}

async function fetchAvailableStaff() {
  const res = await fetch("/api/users/warehouse-staff");
  const json = await res.json();
  return json.success ? json.data : [];
}

export function WarehouseStaffDialog({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  onSuccess,
}: WarehouseStaffDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isManager, setIsManager] = useState(false);

  const { data: assigned, isLoading } = useQuery({
    queryKey: ["warehouse-staff", warehouseId],
    queryFn: () => fetchStaff(warehouseId!),
    enabled: open && !!warehouseId,
  });

  const { data: availableStaff } = useQuery({
    queryKey: ["warehouse-staff-users"],
    queryFn: fetchAvailableStaff,
    enabled: open,
  });

  const assignStaff = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/warehouses/${warehouseId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, isManager }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Staff assigned");
      setSelectedUserId("");
      setIsManager(false);
      queryClient.invalidateQueries({ queryKey: ["warehouse-staff", warehouseId] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeStaff = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/warehouses/${warehouseId}/staff?userId=${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Staff removed");
      queryClient.invalidateQueries({ queryKey: ["warehouse-staff", warehouseId] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignedIds = new Set(assigned?.map((a) => a.userId) ?? []);
  const unassignedStaff =
    availableStaff?.filter((s: { id: string }) => !assignedIds.has(s.id)) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Staff</DialogTitle>
          <DialogDescription>
            {warehouseName
              ? `Manage staff for ${warehouseName}. Staff only see data for their assigned branch.`
              : "Assign warehouse staff to this branch."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Current Staff</Label>
              {!assigned?.length ? (
                <p className="text-sm text-muted-foreground rounded-lg border px-3 py-4 text-center">
                  No staff assigned yet
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {assigned.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {a.user.firstName} {a.user.lastName}
                          {a.isManager && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Manager
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.user.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Remove staff"
                        onClick={() => removeStaff.mutate(a.userId)}
                        disabled={removeStaff.isPending}
                      >
                        <UserMinus />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label htmlFor="staff-select">Add Staff Member</Label>
              <select
                id="staff-select"
                className={selectClass}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select warehouse staff</option>
                {unassignedStaff.map((s: { id: string; firstName: string; lastName: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isManager}
                  onChange={(e) => setIsManager(e.target.checked)}
                  className="rounded border-input"
                />
                Assign as branch manager
              </label>
              <Button
                type="button"
                size="sm"
                className="self-start"
                disabled={!selectedUserId || assignStaff.isPending}
                onClick={() => assignStaff.mutate()}
              >
                <UserPlus />
                Assign to Branch
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
