"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "@/lib/validations";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId?: string | null;
  onSuccess?: () => void;
}

async function fetchWarehouseStaff() {
  const res = await fetch("/api/users/warehouse-staff");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchWarehouse(id: string) {
  const res = await fetch(`/api/warehouses/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function WarehouseCreateForm({
  onOpenChange,
  onSuccess,
}: Pick<WarehouseFormDialogProps, "onOpenChange" | "onSuccess">) {
  const { data: staff } = useQuery({
    queryKey: ["warehouse-staff-users"],
    queryFn: fetchWarehouseStaff,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWarehouseInput>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: { isActive: true },
  });

  useEffect(() => {
    reset({
      code: "",
      name: "",
      address: "",
      city: "",
      phone: "",
      managerId: "",
      isActive: true,
    });
  }, [reset]);

  async function onSubmit(data: CreateWarehouseInput) {
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          managerId: data.managerId || undefined,
          city: data.city || undefined,
          phone: data.phone || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create branch");
        return;
      }
      toast.success("Warehouse branch created");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Branch Code</Label>
          <Input id="code" placeholder="WH-NYC-01" {...register("code")} />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Branch Name</Label>
          <Input id="name" placeholder="New York Hub" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register("address")} />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="managerId">Branch Manager (optional)</Label>
        <select id="managerId" className={selectClass} {...register("managerId")}>
          <option value="">Assign later</option>
          {staff?.map((s: { id: string; firstName: string; lastName: string }) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Branch"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function WarehouseEditForm({
  warehouseId,
  onOpenChange,
  onSuccess,
}: {
  warehouseId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: warehouse } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: () => fetchWarehouse(warehouseId),
  });

  const { data: staff } = useQuery({
    queryKey: ["warehouse-staff-users"],
    queryFn: fetchWarehouseStaff,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateWarehouseInput>({
    resolver: zodResolver(updateWarehouseSchema),
  });

  useEffect(() => {
    if (warehouse) {
      reset({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city ?? "",
        phone: warehouse.phone ?? "",
        managerId: warehouse.managerId ?? "",
        isActive: warehouse.isActive,
      });
    }
  }, [warehouse, reset]);

  async function onSubmit(data: UpdateWarehouseInput) {
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          managerId: data.managerId || null,
          city: data.city || null,
          phone: data.phone || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update branch");
        return;
      }
      toast.success("Warehouse branch updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-code">Branch Code</Label>
          <Input id="edit-code" {...register("code")} />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-name">Branch Name</Label>
          <Input id="edit-name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-address">Address</Label>
        <Input id="edit-address" {...register("address")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-city">City</Label>
          <Input id="edit-city" {...register("city")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" {...register("phone")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-managerId">Branch Manager</Label>
        <select id="edit-managerId" className={selectClass} {...register("managerId")}>
          <option value="">No manager</option>
          {staff?.map((s: { id: string; firstName: string; lastName: string }) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} className="rounded border-input" />
        Active branch
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !warehouse}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouseId,
  onSuccess,
}: WarehouseFormDialogProps) {
  const isEdit = !!warehouseId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "New Warehouse Branch"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update branch details and manager assignment."
              : "Create an independent warehouse branch with its own inventory."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && warehouseId ? (
          <WarehouseEditForm
            warehouseId={warehouseId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <WarehouseCreateForm onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
