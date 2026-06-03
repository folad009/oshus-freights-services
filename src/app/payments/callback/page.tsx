"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerifyState = "verifying" | "success" | "error";

export default function PaystackCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  const reference = useMemo(
    () => searchParams.get("reference") || searchParams.get("trxref") || "",
    [searchParams]
  );
  const invoiceId = useMemo(() => searchParams.get("invoiceId") || "", [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function verifyPayment() {
      if (!reference) {
        if (!ignore) {
          setState("error");
          setMessage("Missing Paystack reference in callback URL.");
        }
        return;
      }

      try {
        const res = await fetch("/api/payments/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, invoiceId: invoiceId || undefined }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.message || "Payment verification failed");
        }
        if (!ignore) {
          setState("success");
          setMessage("Payment verified successfully.");
          setTimeout(() => router.push("/dashboard/invoices"), 1200);
        }
      } catch (error) {
        if (!ignore) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "Payment verification failed");
        }
      }
    }

    verifyPayment();
    return () => {
      ignore = true;
    };
  }, [reference, invoiceId, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      {state === "verifying" && <Loader2 className="mb-3 size-10 animate-spin text-brand-blue" />}
      {state === "success" && <CheckCircle2 className="mb-3 size-10 text-green-600" />}
      {state === "error" && <XCircle className="mb-3 size-10 text-destructive" />}

      <h1 className="text-2xl font-semibold">
        {state === "verifying" ? "Verifying payment" : state === "success" ? "Payment complete" : "Payment failed"}
      </h1>
      <p className="mt-2 text-muted-foreground">{message}</p>

      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/invoices">Back to invoices</Link>
        </Button>
        {state === "error" && (
          <Button asChild>
            <Link href="/dashboard/invoices">Try again</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
