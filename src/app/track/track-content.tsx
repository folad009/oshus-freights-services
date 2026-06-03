"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  MapPin,
  Clock,
  Truck,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Logo } from "@/components/logo";
import { formatDate, SHIPMENT_STATUS_LABELS } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface TrackingResult {
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string | null;
  currentLocation: string | null;
  events: Array<{ eventType: string; location: string; timestamp: string; notes: string | null }>;
}

const DEMO_NUMBERS = ["OSH-M2K9F8-A3B7", "OSH-M2K9G1-C4D8"];

const LIFECYCLE_STEPS = [
  "DRAFT",
  "SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED_AT_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

function getStepIndex(status: string) {
  const idx = LIFECYCLE_STEPS.indexOf(status as (typeof LIFECYCLE_STEPS)[number]);
  return idx === -1 ? 0 : idx;
}

export default function TrackPageContent() {
  const searchParams = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const track = useCallback(async (number: string) => {
    if (!number.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/track/${number.trim()}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Shipment not found. Check your tracking number and try again.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Unable to reach tracking service. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const prefill = searchParams.get("number");
    if (prefill) {
      setTrackingNumber(prefill);
      track(prefill);
    }
  }, [searchParams, track]);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    await track(trackingNumber);
  }

  function copyNumber() {
    if (!result) return;
    navigator.clipboard.writeText(result.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentStep = result ? getStepIndex(result.status) : 0;
  const progress = result ? Math.round(((currentStep + 1) / LIFECYCLE_STEPS.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/" priority imageClassName="max-h-14" />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-brand-blue text-brand-navy hover:bg-brand-blue/90 font-semibold"
            )}
          >
            Sign In
          </Link>
        </div>
      </header>

      <section className="relative bg-brand-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#37BAEE20,_transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-sm text-brand-blue mb-6">
              <Truck className="size-3.5" />
              Real-Time Shipment Tracking
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">Track Your Shipment</h1>
            <p className="mt-3 text-white/60">
              Enter your tracking number below for live status updates and delivery timeline.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleTrack}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="e.g. OSH-M2K9F8-A3B7"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                className="h-12 pl-10 font-mono text-base bg-white border-0"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !trackingNumber.trim()}
              className="h-12 px-8 bg-brand-blue text-brand-navy hover:bg-brand-blue/90 font-semibold"
            >
              {loading ? "Tracking..." : "Track Now"}
              {!loading && <ArrowRight />}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs text-white/40">Try demo:</span>
            {DEMO_NUMBERS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setTrackingNumber(num);
                  track(num);
                }}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-mono text-brand-blue hover:bg-white/10 transition-colors"
              >
                {num}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </motion.div>
          )}

          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Shipment not found</p>
                <p className="text-sm mt-1 opacity-80">{error}</p>
              </div>
            </motion.div>
          )}

          {!loading && !error && !result && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-blue/10">
                <Package className="size-10 text-brand-blue" />
              </div>
              <h2 className="text-xl font-semibold text-brand-navy">Enter a tracking number</h2>
              <p className="text-muted-foreground max-w-sm">
                Your shipment details, live location, and full delivery timeline will appear here.
              </p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              <Card className="overflow-hidden border-brand-blue/20 shadow-md">
                <div className="h-1.5 bg-muted">
                  <motion.div
                    className="h-full bg-brand-blue"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" as const }}
                  />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Tracking Number
                      </p>
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-mono text-lg">{result.trackingNumber}</CardTitle>
                        <button
                          type="button"
                          onClick={copyNumber}
                          className="text-muted-foreground hover:text-brand-blue transition-colors"
                          aria-label="Copy tracking number"
                        >
                          {copied ? <Check className="size-4 text-brand-blue" /> : <Copy className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <StatusBadge status={result.status} type="shipment" />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="overflow-x-auto pb-1">
                    <div className="flex min-w-max gap-1">
                      {LIFECYCLE_STEPS.map((step, i) => (
                        <div key={step} className="flex flex-col items-center gap-1.5 flex-1 min-w-[72px]">
                          <div
                            className={cn(
                              "size-2.5 rounded-full transition-colors",
                              i <= currentStep ? "bg-brand-blue" : "bg-border"
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px] text-center leading-tight",
                              i <= currentStep ? "text-brand-navy font-medium" : "text-muted-foreground"
                            )}
                          >
                            {SHIPMENT_STATUS_LABELS[step]?.split(" ").slice(-1)[0] ?? step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-brand-blue mb-2">
                        <MapPin className="size-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Route</span>
                      </div>
                      <p className="text-sm font-medium text-brand-navy">{result.origin}</p>
                      <p className="text-xs text-muted-foreground my-1">↓</p>
                      <p className="text-sm font-medium text-brand-navy">{result.destination}</p>
                    </div>

                    {result.currentLocation && (
                      <div className="rounded-xl bg-brand-blue/10 p-4">
                        <div className="flex items-center gap-2 text-brand-blue mb-2">
                          <Truck className="size-4" />
                          <span className="text-xs font-medium uppercase tracking-wide">Live Location</span>
                        </div>
                        <p className="text-sm font-semibold text-brand-navy">{result.currentLocation}</p>
                        <Badge variant="secondary" className="mt-2 bg-brand-blue/20 text-brand-navy text-xs">
                          In transit
                        </Badge>
                      </div>
                    )}

                    {result.estimatedDelivery && (
                      <div className="rounded-xl bg-muted/50 p-4">
                        <div className="flex items-center gap-2 text-brand-blue mb-2">
                          <Clock className="size-4" />
                          <span className="text-xs font-medium uppercase tracking-wide">ETA</span>
                        </div>
                        <p className="text-sm font-semibold text-brand-navy">
                          {formatDate(result.estimatedDelivery)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-navy">Delivery Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col">
                    {result.events.map((event, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "size-3 rounded-full ring-4",
                              i === 0
                                ? "bg-brand-blue ring-brand-blue/20"
                                : "bg-brand-navy/30 ring-transparent"
                            )}
                          />
                          {i < result.events.length - 1 && (
                            <div className="w-px flex-1 bg-border min-h-10 my-1" />
                          )}
                        </div>
                        <div className="pb-6 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={event.eventType} type="shipment" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-brand-navy">{event.location}</p>
                          {event.notes && (
                            <p className="text-sm text-muted-foreground mt-0.5">{event.notes}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
