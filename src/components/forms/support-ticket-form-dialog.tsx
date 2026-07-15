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
  createTicketSchema,
  staffCreateTicketSchema,
  type CreateTicketInput,
  type StaffCreateTicketInput,
} from "@/lib/validations";
import { TicketCategory, UserRole } from "@/types/enums";
import { cn } from "@/lib/utils";

const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  SHIPMENT_DELAY: "Shipment delay",
  DAMAGED_GOODS: "Damaged goods",
  LOST_SHIPMENT: "Lost shipment",
  BILLING_ISSUE: "Billing issue",
  GENERAL_INQUIRY: "General inquiry",
};

interface SupportTicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

async function fetchCustomers() {
  const res = await fetch("/api/customers");
  const json = await res.json();
  return json.success ? json.data : [];
}

export function SupportTicketFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: SupportTicketFormDialogProps) {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === UserRole.CUSTOMER;

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: open && !isCustomer,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffCreateTicketInput | CreateTicketInput>({
    resolver: zodResolver(isCustomer ? createTicketSchema : staffCreateTicketSchema),
    defaultValues: {
      customerId: "",
      category: TicketCategory.GENERAL_INQUIRY,
      subject: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        customerId: "",
        category: TicketCategory.GENERAL_INQUIRY,
        subject: "",
        description: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(data: StaffCreateTicketInput | CreateTicketInput) {
    try {
      const payload = isCustomer
        ? data
        : {
            ...data,
            customerId: (data as StaffCreateTicketInput).customerId,
          };

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create support ticket");
        return;
      }
      toast.success("Support ticket created");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogDescription>
            {isCustomer
              ? "Describe your issue and our team will follow up."
              : "Log a customer support request on their behalf."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!isCustomer && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerId">
                Customer <span className="text-destructive">*</span>
              </Label>
              <select id="customerId" className={formSelectClass} {...register("customerId")}>
                <option value="">Select customer</option>
                {customers?.map((customer: { id: string; companyName: string }) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
              {"customerId" in errors && errors.customerId && (
                <p className="text-sm text-destructive">{errors.customerId.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Category</Label>
            <select id="category" className={formSelectClass} {...register("category")}>
              {Object.values(TicketCategory).map((category) => (
                <option key={category} value={category}>
                  {TICKET_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Brief summary of the issue" {...register("subject")} />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              className={cn(formSelectClass, "h-auto resize-none py-2")}
              placeholder="Provide details to help the support team"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
