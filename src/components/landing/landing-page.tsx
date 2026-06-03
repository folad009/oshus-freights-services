"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Package,
  Shield,
  Truck,
  Zap,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const stats = [
  { label: "Shipments Delivered", value: "50K+" },
  { label: "Active Fleet", value: "120+" },
  { label: "Warehouses", value: "15" },
  { label: "On-Time Rate", value: "98%" },
];

const features = [
  {
    icon: Package,
    title: "Shipment Management",
    description: "Create, schedule, and track shipments through every stage — from draft to delivery.",
    color: "bg-brand-blue/15 text-brand-blue",
  },
  {
    icon: Truck,
    title: "Fleet & Warehouse",
    description: "Manage vehicles, drivers, inventory, and multi-warehouse operations in one place.",
    color: "bg-brand-navy/10 text-brand-navy",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access, audit logs, and secure authentication for every team member.",
    color: "bg-brand-blue/15 text-brand-blue",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Real-time dashboards, revenue tracking, and operational insights at a glance.",
    color: "bg-brand-navy/10 text-brand-navy",
  },
];

const steps = [
  { step: "01", title: "Create Shipment", desc: "Book domestic or international freight in minutes." },
  { step: "02", title: "Track in Real-Time", desc: "Monitor location, status, and ETA on your dashboard." },
  { step: "03", title: "Deliver & Invoice", desc: "Confirm delivery, generate invoices, and collect payments." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo priority imageClassName="max-h-16" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/track"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Track Shipment
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants(),
                "bg-brand-blue text-brand-navy hover:bg-brand-blue/90 font-semibold"
              )}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-brand-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#37BAEE22,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#37BAEE15,_transparent_50%)]" />
        <div className="absolute top-20 right-10 size-64 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 size-48 rounded-full bg-brand-blue/5 blur-2xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center"
          >
            <motion.div
              custom={0}
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-sm text-brand-blue mb-6"
            >
              <Zap className="size-3.5" />
              Enterprise Logistics Platform
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Move freight smarter with{" "}<br/>
              <span className="text-brand-blue">Oshus Freight Services</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="mt-6 max-w-2xl text-lg text-white/70"
            >
              End-to-end shipment management, real-time tracking, fleet operations,
              and billing — all in one unified platform built for scale.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand-blue text-white hover:bg-brand-blue/90 font-semibold px-8"
                )}
              >
                Get Started
                <ArrowRight />
              </Link>
              <Link
                href="/track"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-white/30 text-black hover:bg-white/10  px-8"
                )}
              >
                Track a Shipment
              </Link>
            </motion.div>

            {/* Quick track input */}
            <motion.div
              custom={4}
              variants={fadeUp}
              className="mt-12 w-full max-w-md"
            >
              <p className="text-sm text-white/50 mb-2">Try a demo tracking number</p>
              <Link
                href="/track?number=OSH-M2K9F8-A3B7"
                className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-mono text-brand-blue hover:bg-white/10 transition-colors"
              >
                OSH-M2K9F8-A3B7
                <ArrowRight className="size-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-1 bg-white px-6 py-8 text-center"
            >
              <span className="text-3xl font-bold text-brand-navy">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-brand-navy sm:text-4xl">
              Everything you need to run logistics
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              From first mile to last mile — manage your entire supply chain with confidence.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all"
              >
                <div className={cn("inline-flex rounded-xl p-3 mb-4", feature.color)}>
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-brand-navy sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">Three simple steps to move your freight</p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-navy text-brand-blue font-bold text-xl mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-brand-navy text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl px-4"
        >
          <div className="relative overflow-hidden rounded-3xl bg-brand-navy px-8 py-14 text-center text-white sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#37BAEE22,_transparent_70%)]" />
            <div className="relative">
              <Globe className="size-10 text-brand-blue mx-auto mb-4" />
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to streamline your logistics?</h2>
              <p className="mt-3 text-white/70 max-w-md mx-auto">
                Join Oshus Freight Services and take control of your supply chain today.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-brand-blue text-brand-navy hover:bg-brand-blue/90 font-semibold"
                  )}
                >
                  Start Free
                  <ArrowRight />
                </Link>
                <Link
                  href="/track"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "border-white/30 text-white hover:bg-white/10"
                  )}
                >
                  Track Shipment
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
                {["No credit card required", "6 role-based portals", "Real-time tracking"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-brand-blue" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-brand-navy py-8 text-center text-sm text-white/60">
        © {new Date().getFullYear()} Oshus Freight Services. All rights reserved.
      </footer>
    </div>
  );
}
