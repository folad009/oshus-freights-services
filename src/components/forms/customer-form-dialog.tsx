"use client";

import { useEffect, useState } from "react";
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
  IdDocumentUploadField,
  uploadStaffCustomerIdDocument,
  validateIdDocumentFields,
} from "@/components/forms/id-document-upload-field";
import {
  customerProfileSchema,
  updateCustomerSchema,
  type CustomerProfileInput,
  type UpdateCustomerInput,
} from "@/lib/validations";
import { GovernmentIdType } from "@/types/enums";

const textareaClass =
  "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string | null;
  onSuccess?: () => void;
}

async function fetchCustomer(id: string) {
  const res = await fetch(`/api/customers/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function CustomerCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<CustomerFormDialogProps, "customerId">) {
  const [idDocumentType, setIdDocumentType] = useState<GovernmentIdType | "">("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [idDocumentError, setIdDocumentError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerProfileInput>({
    resolver: zodResolver(customerProfileSchema),
  });

  useEffect(() => {
    if (open) {
      setIdDocumentType("");
      setIdDocumentNumber("");
      setIdDocumentFile(null);
      setIdDocumentError("");
      reset({
        companyName: "",
        contactPerson: "",
        phone: "",
        address: "",
        email: "",
        password: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(data: CustomerProfileInput) {
    try {
      validateIdDocumentFields(idDocumentType, idDocumentNumber, idDocumentFile);
      setIdDocumentError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid ID document";
      setIdDocumentError(message);
      toast.error(message);
      return;
    }

    try {
      const uploaded = await uploadStaffCustomerIdDocument(
        idDocumentFile!,
        idDocumentType as GovernmentIdType,
        idDocumentNumber
      );

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          idDocumentType: uploaded.idDocumentType,
          idDocumentNumber: uploaded.idDocumentNumber,
          idDocumentStorageKey: uploaded.storageKey,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create customer");
        return;
      }
      toast.success("Customer created");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" {...register("companyName")} />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contactPerson">Contact Person</Label>
        <Input id="contactPerson" {...register("contactPerson")} />
        {errors.contactPerson && (
          <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <textarea id="address" rows={2} className={textareaClass} {...register("address")} />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <IdDocumentUploadField
        idDocumentType={idDocumentType}
        onIdDocumentTypeChange={setIdDocumentType}
        idDocumentNumber={idDocumentNumber}
        onIdDocumentNumberChange={setIdDocumentNumber}
        selectedFile={idDocumentFile}
        onSelectedFileChange={setIdDocumentFile}
        error={idDocumentError}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create Customer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CustomerEditForm({
  open,
  customerId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  customerId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => fetchCustomer(customerId),
    enabled: open && !!customerId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
  });

  useEffect(() => {
    if (open && customer) {
      reset({
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        address: customer.address,
        email: customer.user?.email ?? "",
      });
    }
  }, [open, customer, reset]);

  async function onSubmit(data: UpdateCustomerInput) {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update customer");
        return;
      }
      toast.success("Customer updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-companyName">Company Name</Label>
        <Input id="edit-companyName" {...register("companyName")} />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-contactPerson">Contact Person</Label>
        <Input id="edit-contactPerson" {...register("contactPerson")} />
        {errors.contactPerson && (
          <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input id="edit-email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-address">Address</Label>
        <textarea id="edit-address" rows={2} className={textareaClass} {...register("address")} />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !customer}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customerId,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEdit = !!customerId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update customer profile and contact details."
              : "Register a new customer account with verified government ID."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && customerId ? (
          <CustomerEditForm
            open={open}
            customerId={customerId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <CustomerCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
