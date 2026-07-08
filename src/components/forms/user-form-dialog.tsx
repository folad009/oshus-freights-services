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
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations";
import { ROLE_LABELS, STAFF_USER_ROLES } from "@/lib/rbac";
import { UserRole, UserStatus } from "@/types/enums";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  onSuccess?: () => void;
}

type UserDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  customer: { id: string } | null;
  driver: { licenseNumber: string } | null;
};

async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as UserDetail;
}

function UserCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<UserFormDialogProps, "userId">) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: UserRole.DISPATCHER,
      licenseNumber: "",
    },
  });

  const role = watch("role");

  useEffect(() => {
    if (open) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: UserRole.DISPATCHER,
        licenseNumber: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(data: CreateUserInput) {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create user");
        return;
      }
      toast.success("User created");
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
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Role</Label>
        <select id="role" className={formSelectClass} {...register("role")}>
          {STAFF_USER_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      {role === UserRole.DRIVER && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="licenseNumber">Driver License Number</Label>
          <Input id="licenseNumber" {...register("licenseNumber")} />
          {errors.licenseNumber && (
            <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create User"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UserEditForm({
  open,
  userId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  userId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
    enabled: open && !!userId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  });

  const role = watch("role");
  const isCustomerAccount = !!user?.customer;

  useEffect(() => {
    if (open && user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        password: "",
        licenseNumber: user.driver?.licenseNumber ?? "",
      });
    }
  }, [open, user, reset]);

  async function onSubmit(data: UpdateUserInput) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update user");
        return;
      }
      toast.success("User updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isCustomerAccount && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          This is a customer account. Edit company details from the Customers page. Role changes
          are not allowed here.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-firstName">First Name</Label>
          <Input id="edit-firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-lastName">Last Name</Label>
          <Input id="edit-lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input id="edit-email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-role">Role</Label>
          <select
            id="edit-role"
            className={formSelectClass}
            {...register("role")}
            disabled={isCustomerAccount}
          >
            {isCustomerAccount ? (
              <option value={UserRole.CUSTOMER}>{ROLE_LABELS[UserRole.CUSTOMER]}</option>
            ) : (
              STAFF_USER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))
            )}
          </select>
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select id="edit-status" className={formSelectClass} {...register("status")}>
            {Object.values(UserStatus).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
        </div>
      </div>

      {role === UserRole.DRIVER && !isCustomerAccount && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-licenseNumber">Driver License Number</Label>
          <Input id="edit-licenseNumber" {...register("licenseNumber")} />
          {errors.licenseNumber && (
            <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-password">New Password</Label>
        <Input
          id="edit-password"
          type="password"
          placeholder="Leave blank to keep current password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !user}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UserFormDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: UserFormDialogProps) {
  const isEdit = !!userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update account details, role, or status."
              : "Create a staff account. Customer accounts are managed from the Customers page."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && userId ? (
          <UserEditForm
            open={open}
            userId={userId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <UserCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
