"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import {
  PackageMetricsPanel,
  formSelectClass,
} from "@/components/forms/shipment-package-metrics-panel";
import {
  calculateInsuranceCost,
  calculateShipmentInvoiceBreakdown,
  DELIVERY_SERVICE_FEE,
  PICKUP_SERVICE_FEE,
} from "@/lib/billing";
import { formatCurrency } from "@/lib/helpers";
import { getShipmentTypeOptions } from "@/lib/shipment-types";
import { calculateVolumetricWeightKg } from "@/lib/shipment-metrics";
import { submitShipmentIntakeSchema, type SubmitShipmentIntakeInput } from "@/lib/validations";
import { ShipmentType } from "@/types/enums";
import { cn } from "@/lib/utils";

type IntakeLinkInfo = {
  expiresAt: string;
  warehouse: { code: string; name: string } | null;
  createdBy: { firstName: string; lastName: string };
};

export function ShipmentIntakeForm({ token }: { token: string }) {
  const [linkInfo, setLinkInfo] = useState<IntakeLinkInfo | null>(null);
  const [linkError, setLinkError] = useState("");
  const [loadingLink, setLoadingLink] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ trackingNumber: string } | null>(null);

  const {
    register,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SubmitShipmentIntakeInput>({
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      address: "",
      email: "",
      shipmentType: ShipmentType.STANDARD_AIR_FREIGHT,
      packageCount: 1,
      origin: "",
      destination: "",
      notes: "",
      requestPickup: false,
      requestDelivery: false,
      pickupAddress: "",
      deliveryAddress: "",
      hasInsurance: false,
      acceptedTerms: false,
    },
  });

  const shipmentType = watch("shipmentType");
  const lengthCm = watch("lengthCm");
  const widthCm = watch("widthCm");
  const heightCm = watch("heightCm");
  const packageCount = watch("packageCount");
  const requestPickup = watch("requestPickup");
  const requestDelivery = watch("requestDelivery");
  const hasInsurance = watch("hasInsurance");
  const declaredValue = watch("declaredValue");
  const weight = watch("weight");

  const shipmentTypeOptions = getShipmentTypeOptions(true);

  const costEstimate = useMemo(() => {
    if (!shipmentType || !weight || weight <= 0) return null;
    return calculateShipmentInvoiceBreakdown({
      shipmentType,
      weight,
      requestPickup: !!requestPickup,
      requestDelivery: !!requestDelivery,
      hasInsurance: !!hasInsurance,
      declaredValue,
    });
  }, [shipmentType, weight, requestPickup, requestDelivery, hasInsurance, declaredValue]);

  useEffect(() => {
    async function loadLink() {
      setLoadingLink(true);
      setLinkError("");
      try {
        const res = await fetch(`/api/shipment-intake-links/${token}`);
        const json = await res.json();
        if (!json.success) {
          setLinkError(json.message ?? "This link is invalid or has expired.");
          return;
        }
        setLinkInfo(json.data);
      } catch {
        setLinkError("Unable to load this intake form. Please try again later.");
      } finally {
        setLoadingLink(false);
      }
    }
    void loadLink();
  }, [token]);

  async function handleSubmit() {
    if (isSubmitting) return;
    clearErrors();

    if (!acceptedTerms) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    const values = getValues();
    const computedWeight = calculateVolumetricWeightKg({
      lengthCm: Number(values.lengthCm),
      widthCm: Number(values.widthCm),
      heightCm: Number(values.heightCm),
      packageCount: values.packageCount ?? 1,
    });

    const parsed = submitShipmentIntakeSchema.safeParse({
      ...values,
      weight: computedWeight,
      notes: values.notes?.trim() || undefined,
      scheduledPickup: values.scheduledPickup?.trim() || undefined,
      pickupAddress: values.pickupAddress?.trim() || undefined,
      deliveryAddress: values.deliveryAddress?.trim() || undefined,
      acceptedTerms: true,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0];
      toast.error(issue.message);
      if (typeof field === "string") {
        setError(field as keyof SubmitShipmentIntakeInput, { message: issue.message });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipment-intake-links/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to submit shipment request");
        return;
      }
      setSubmitted({ trackingNumber: json.data.trackingNumber });
      toast.success("Shipment request submitted");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingLink) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkError) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Link unavailable</CardTitle>
          <CardDescription>{linkError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Request submitted</CardTitle>
          <CardDescription>
            Your shipment details have been received. Save your tracking number to follow progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking number</p>
            <p className="mt-1 font-mono text-lg font-semibold">{submitted.trackingNumber}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/track?number=${encodeURIComponent(submitted.trackingNumber)}`}
              className={buttonVariants()}
            >
              Track shipment
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      className="mx-auto flex max-w-2xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Shipment request</h1>
        <p className="text-sm text-muted-foreground">
          Complete your contact details and shipment information below.
          {linkInfo?.createdBy
            ? ` Sent by ${linkInfo.createdBy.firstName} ${linkInfo.createdBy.lastName}.`
            : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>We will use this information to create your customer profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="companyName">Company or sender name</Label>
            <Input id="companyName" {...register("companyName")} />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
            {errors.contactPerson && (
              <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Street, city, postal code" {...register("address")} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipment details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="shipmentType">Type of shipment</Label>
            <select id="shipmentType" className={formSelectClass} {...register("shipmentType")}>
              {shipmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <PackageMetricsPanel
            register={register}
            errors={errors}
            shipmentType={shipmentType}
            lengthCm={lengthCm}
            widthCm={widthCm}
            heightCm={heightCm}
            packageCount={packageCount}
            onWeightChange={(value) => setValue("weight", value)}
            showContainerDetails={false}
            idPrefix="intake-"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="origin">Origin</Label>
              <Input id="origin" placeholder="City, State" {...register("origin")} />
              {errors.origin && <p className="text-sm text-destructive">{errors.origin.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" placeholder="City, State" {...register("destination")} />
              {errors.destination && (
                <p className="text-sm text-destructive">{errors.destination.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div>
              <p className="text-sm font-medium">Door services</p>
              <p className="text-xs text-muted-foreground">
                Optional pickup and delivery ({formatCurrency(PICKUP_SERVICE_FEE)} pickup ·{" "}
                {formatCurrency(DELIVERY_SERVICE_FEE)} delivery).
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" {...register("requestPickup")} />
              <span>Request door pickup</span>
            </label>
            {requestPickup && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="pickupAddress">Pickup address</Label>
                <Input id="pickupAddress" {...register("pickupAddress")} />
                {errors.pickupAddress && (
                  <p className="text-sm text-destructive">{errors.pickupAddress.message}</p>
                )}
              </div>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" {...register("requestDelivery")} />
              <span>Request door delivery</span>
            </label>
            {requestDelivery && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliveryAddress">Delivery address</Label>
                <Input id="deliveryAddress" {...register("deliveryAddress")} />
                {errors.deliveryAddress && (
                  <p className="text-sm text-destructive">{errors.deliveryAddress.message}</p>
                )}
              </div>
            )}
            {requestPickup && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="scheduledPickup">Preferred pickup date & time</Label>
                <Input id="scheduledPickup" type="datetime-local" {...register("scheduledPickup")} />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div>
              <p className="text-sm font-medium">Insurance coverage</p>
              <p className="text-xs text-muted-foreground">Optional cargo insurance based on declared value.</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" {...register("hasInsurance")} />
              <span>Add insurance coverage</span>
            </label>
            {hasInsurance && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="declaredValue">Declared value (USD)</Label>
                <Input
                  id="declaredValue"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("declaredValue", { valueAsNumber: true })}
                />
                {errors.declaredValue && (
                  <p className="text-sm text-destructive">{errors.declaredValue.message}</p>
                )}
                {declaredValue && declaredValue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimated insurance: {formatCurrency(calculateInsuranceCost(declaredValue))}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              className={cn(formSelectClass, "h-auto py-2 resize-none")}
              placeholder="Optional instructions"
              {...register("notes")}
            />
          </div>

          {costEstimate && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Estimated invoice</p>
              <div className="mt-2 flex justify-between border-t pt-1 font-medium">
                <span>Total (incl. tax)</span>
                <span>{formatCurrency(costEstimate.totalAmount)}</span>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              I have read and agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">
                Terms and Conditions
              </Link>
              .
            </span>
          </label>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isSubmitting || !acceptedTerms} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Package className="size-4" />
            Submit shipment request
          </>
        )}
      </Button>
    </form>
  );
}

export function ShipmentIntakePageShell({ token }: { token: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Logo href="/" imageClassName="h-7 w-auto max-h-7" />
        </div>
      </header>
      <main className="px-4 py-8">
        <ShipmentIntakeForm token={token} />
      </main>
    </div>
  );
}
