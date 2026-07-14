"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";
import {
  createInventorySchema,
  updateInventorySchema,
  type CreateInventoryInput,
  type UpdateInventoryInput,
} from "@/lib/validations";
import { getInventoryCategoryOptions } from "@/lib/inventory";
import { InventoryCategory, UserRole } from "@/types/enums";

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId?: string | null;
  onSuccess?: () => void;
}

async function fetchWarehouseOptions() {
  const res = await fetch("/api/warehouses/options");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchInventoryItem(id: string) {
  const res = await fetch(`/api/inventory/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function InventoryCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<InventoryFormDialogProps, "inventoryId">) {
  const { data: session } = useSession();
  const isWarehouseStaff = session?.user?.role === UserRole.WAREHOUSE_STAFF;
  const categoryOptions = getInventoryCategoryOptions();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: fetchWarehouseOptions,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInventoryInput>({
    resolver: zodResolver(createInventorySchema),
    defaultValues: {
      warehouseId: "",
      sku: "",
      productName: "",
      category: InventoryCategory.GOODS,
      quantity: 0,
      unitCost: 0,
      reorderLevel: 10,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        warehouseId: "",
        sku: "",
        productName: "",
        category: InventoryCategory.GOODS,
        quantity: 0,
        unitCost: 0,
        reorderLevel: 10,
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open || !isWarehouseStaff || !warehouses?.length) return;
    if (warehouses.length === 1) {
      setValue("warehouseId", warehouses[0].id);
    }
  }, [open, isWarehouseStaff, warehouses, setValue]);

  async function onSubmit(data: CreateInventoryInput) {
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to add inventory item");
        return;
      }
      toast.success("Inventory item added");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="warehouseId">
          Warehouse Branch <span className="text-destructive">*</span>
        </Label>
        <select id="warehouseId" className={formSelectClass} {...register("warehouseId")}>
          <option value="">Select branch</option>
          {warehouses?.map((w: { id: string; code: string; name: string }) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
        {errors.warehouseId && (
          <p className="text-sm text-destructive">{errors.warehouseId.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sku">
            SKU <span className="text-destructive">*</span>
          </Label>
          <Input id="sku" placeholder="PKG-001" {...register("sku")} />
          {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <select id="category" className={formSelectClass} {...register("category")}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="productName">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input id="productName" {...register("productName")} />
        {errors.productName && (
          <p className="text-sm text-destructive">{errors.productName.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            step="1"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            min="0"
            step="0.01"
            {...register("unitCost", { valueAsNumber: true })}
          />
          {errors.unitCost && (
            <p className="text-sm text-destructive">{errors.unitCost.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reorderLevel">Reorder Level</Label>
          <Input
            id="reorderLevel"
            type="number"
            min="0"
            step="1"
            {...register("reorderLevel", { valueAsNumber: true })}
          />
          {errors.reorderLevel && (
            <p className="text-sm text-destructive">{errors.reorderLevel.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Add Item"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function InventoryEditForm({
  open,
  inventoryId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  inventoryId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const categoryOptions = getInventoryCategoryOptions();

  const { data: item } = useQuery({
    queryKey: ["inventory-item", inventoryId],
    queryFn: () => fetchInventoryItem(inventoryId),
    enabled: open && !!inventoryId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateInventoryInput>({
    resolver: zodResolver(updateInventorySchema),
  });

  useEffect(() => {
    if (open && item) {
      reset({
        productName: item.productName,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        reorderLevel: item.reorderLevel,
        adjustmentNotes: "",
      });
    }
  }, [open, item, reset]);

  async function onSubmit(data: UpdateInventoryInput) {
    try {
      const res = await fetch(`/api/inventory/${inventoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update inventory item");
        return;
      }
      toast.success("Inventory item updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {item && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{item.productName}</p>
          <p className="text-muted-foreground">
            {item.sku} · {item.warehouse.code} — {item.warehouse.name}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-productName">Product Name</Label>
        <Input id="edit-productName" {...register("productName")} />
        {errors.productName && (
          <p className="text-sm text-destructive">{errors.productName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-category">Category</Label>
        <select id="edit-category" className={formSelectClass} {...register("category")}>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-quantity">Quantity</Label>
          <Input
            id="edit-quantity"
            type="number"
            min="0"
            step="1"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-unitCost">Unit Cost ($)</Label>
          <Input
            id="edit-unitCost"
            type="number"
            min="0"
            step="0.01"
            {...register("unitCost", { valueAsNumber: true })}
          />
          {errors.unitCost && (
            <p className="text-sm text-destructive">{errors.unitCost.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-reorderLevel">Reorder Level</Label>
          <Input
            id="edit-reorderLevel"
            type="number"
            min="0"
            step="1"
            {...register("reorderLevel", { valueAsNumber: true })}
          />
          {errors.reorderLevel && (
            <p className="text-sm text-destructive">{errors.reorderLevel.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-adjustmentNotes">Adjustment Notes</Label>
        <Input
          id="edit-adjustmentNotes"
          placeholder="Optional reason when changing quantity"
          {...register("adjustmentNotes")}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !item}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  inventoryId,
  onSuccess,
}: InventoryFormDialogProps) {
  const isEdit = !!inventoryId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update stock levels and product details for this branch."
              : "Add a new product to your warehouse branch inventory."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && inventoryId ? (
          <InventoryEditForm
            open={open}
            inventoryId={inventoryId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <InventoryCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
