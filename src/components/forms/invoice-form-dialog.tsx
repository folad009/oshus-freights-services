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
  createInvoiceSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
} from "@/lib/validations";
import { InvoiceStatus } from "@/types/enums";
import { formatCurrency } from "@/lib/helpers";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string | null;
  onSuccess?: () => void;
}

async function fetchCustomers() {
  const res = await fetch("/api/customers");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchShipments() {
  const res = await fetch("/api/shipments");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchInvoice(id: string) {
  const res = await fetch(`/api/invoices/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function InvoiceCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<InvoiceFormDialogProps, "invoiceId">) {
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: open,
  });

  const { data: shipments } = useQuery({
    queryKey: ["shipments"],
    queryFn: fetchShipments,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: { tax: 0 },
  });

  const amount = watch("amount") ?? 0;
  const tax = watch("tax") ?? 0;

  useEffect(() => {
    if (open) {
      reset({
        customerId: "",
        shipmentId: "",
        serviceType: "",
        amount: undefined,
        tax: 0,
        dueDate: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(data: CreateInvoiceInput) {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          shipmentId: data.shipmentId || undefined,
          dueDate: new Date(data.dueDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create invoice");
        return;
      }
      toast.success("Invoice created");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Customer</Label>
        <select id="customerId" className={selectClass} {...register("customerId")}>
          <option value="">Select customer</option>
          {customers?.map((c: { id: string; companyName: string }) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
        {errors.customerId && (
          <p className="text-sm text-destructive">{errors.customerId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shipmentId">Linked Shipment (optional)</Label>
        <select id="shipmentId" className={selectClass} {...register("shipmentId")}>
          <option value="">None</option>
          {shipments?.map((s: { id: string; trackingNumber: string }) => (
            <option key={s.id} value={s.id}>
              {s.trackingNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="serviceType">Service Type</Label>
        <Input id="serviceType" placeholder="e.g. Standard Freight" {...register("serviceType")} />
        {errors.serviceType && (
          <p className="text-sm text-destructive">{errors.serviceType.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tax">Tax (USD)</Label>
          <Input id="tax" type="number" step="0.01" {...register("tax", { valueAsNumber: true })} />
          {errors.tax && <p className="text-sm text-destructive">{errors.tax.message}</p>}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Total: {formatCurrency(Number(amount) + Number(tax))}
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input id="dueDate" type="datetime-local" {...register("dueDate")} />
        {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create Invoice"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function InvoiceEditForm({
  open,
  invoiceId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  invoiceId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: invoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice(invoiceId),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateInvoiceInput>({
    resolver: zodResolver(updateInvoiceSchema),
  });

  const amount = watch("amount") ?? invoice?.amount ?? 0;
  const tax = watch("tax") ?? invoice?.tax ?? 0;

  useEffect(() => {
    if (open && invoice) {
      reset({
        serviceType: invoice.serviceType,
        amount: invoice.amount,
        tax: invoice.tax,
        dueDate: new Date(invoice.dueDate).toISOString().slice(0, 16),
        status: invoice.status,
      });
    }
  }, [open, invoice, reset]);

  async function onSubmit(data: UpdateInvoiceInput) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update invoice");
        return;
      }
      toast.success("Invoice updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const isPaid = invoice?.status === InvoiceStatus.PAID;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {invoice && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
          <span className="text-muted-foreground"> · {invoice.customer?.companyName}</span>
          {invoice.shipment && (
            <span className="text-muted-foreground"> · {invoice.shipment.trackingNumber}</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-serviceType">Service Type</Label>
        <Input id="edit-serviceType" {...register("serviceType")} disabled={isPaid} />
        {errors.serviceType && (
          <p className="text-sm text-destructive">{errors.serviceType.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-amount">Amount (USD)</Label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            disabled={isPaid}
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-tax">Tax (USD)</Label>
          <Input
            id="edit-tax"
            type="number"
            step="0.01"
            disabled={isPaid}
            {...register("tax", { valueAsNumber: true })}
          />
          {errors.tax && <p className="text-sm text-destructive">{errors.tax.message}</p>}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Total: {formatCurrency(Number(amount) + Number(tax))}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-dueDate">Due Date</Label>
          <Input id="edit-dueDate" type="datetime-local" disabled={isPaid} {...register("dueDate")} />
          {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select id="edit-status" className={selectClass} {...register("status")}>
            {Object.values(InvoiceStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !invoice}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess,
}: InvoiceFormDialogProps) {
  const isEdit = !!invoiceId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update invoice details or change status to send to customer."
              : "Create a new invoice for a customer."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && invoiceId ? (
          <InvoiceEditForm
            open={open}
            invoiceId={invoiceId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <InvoiceCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
