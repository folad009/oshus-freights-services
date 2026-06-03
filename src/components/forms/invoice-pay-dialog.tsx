"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { payInvoiceSchema, type PayInvoiceInput } from "@/lib/validations";
import { formatCurrency, getInvoiceBalance, canPayInvoice } from "@/lib/helpers";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PAYMENT_METHODS = [
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
] as const;

interface InvoicePayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onSuccess?: () => void;
}

async function fetchInvoice(id: string) {
  const res = await fetch(`/api/invoices/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    payments: { amount: number }[];
  };
}

export function InvoicePayDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess,
}: InvoicePayDialogProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice(invoiceId!),
    enabled: open && !!invoiceId,
  });

  const balance = invoice ? getInvoiceBalance(invoice) : 0;
  const payable = invoice ? canPayInvoice(invoice.status) && balance > 0 : false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PayInvoiceInput>({
    resolver: zodResolver(payInvoiceSchema),
    defaultValues: { paymentMethod: "CREDIT_CARD", reference: "" },
  });

  async function onSubmit(data: PayInvoiceInput) {
    if (!invoiceId) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Payment failed");
        return;
      }
      if (!json.data?.authorizationUrl) {
        toast.error("Unable to start Paystack checkout");
        return;
      }
      toast.success("Redirecting to Paystack checkout...");
      reset();
      onOpenChange(false);
      onSuccess?.();
      window.location.assign(json.data.authorizationUrl);
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-brand-blue" />
            Pay Invoice
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? `Complete payment for ${invoice.invoiceNumber}`
              : "Loading invoice..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !invoice ? (
          <Skeleton className="h-32 w-full" />
        ) : !payable ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            This invoice is not available for payment.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="rounded-lg border bg-brand-blue/5 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="text-2xl font-bold text-brand-navy">{formatCurrency(balance)}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select id="paymentMethod" className={selectClass} {...register("paymentMethod")}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                placeholder="Transaction or confirmation ID"
                {...register("reference")}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Redirecting..." : `Pay with Paystack ${formatCurrency(balance)}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
