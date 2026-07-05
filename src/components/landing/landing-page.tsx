"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe,
  Package,
  Shield,
  Truck,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LANDING_IMAGES } from "@/lib/landing-images";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const features = [
  {
    icon: Package,
    title: "Shipment Management",
    description:
      "Create, schedule, and track shipments through every stage — from draft to delivery.",
    color: "bg-brand-blue/15 text-brand-blue",
  },
  {
    icon: Truck,
    title: "Fleet & Warehouse",
    description:
      "Manage vehicles, drivers, inventory, and multi-warehouse operations in one place.",
    color: "bg-brand-navy/10 text-brand-navy",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Role-based access, audit logs, and secure authentication for every team member.",
    color: "bg-brand-blue/15 text-brand-blue",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Real-time dashboards, revenue tracking, and operational insights at a glance.",
    color: "bg-brand-navy/10 text-brand-navy",
  },
];

const steps = [
  {
    step: "01",
    title: "Create Shipment",
    desc: "Book domestic or international freight in minutes at the front desk or online.",
  },
  {
    step: "02",
    title: "Track in Real-Time",
    desc: "Monitor location, status, and ETA from your dashboard or with a barcode scan.",
  },
  {
    step: "03",
    title: "Deliver & Invoice",
    desc: "Confirm delivery, generate waybills, and collect payments in one workflow.",
  },
];

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          ".hero-badge, .hero-title, .hero-subtitle, .hero-cta-link, .hero-demo, .features-heading, .feature-card, .how-copy > *, .how-step, .how-image, .cta-content > *",
          { clearProps: "all", opacity: 1, y: 0, x: 0, scale: 1 }
        );
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scrollFromDefaults = { immediateRender: false };
        const heroFromDefaults = { immediateRender: false };

        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".hero-badge", { opacity: 0, y: 28, duration: 0.65, ...heroFromDefaults })
          .from(".hero-title", { opacity: 0, y: 36, duration: 0.75, ...heroFromDefaults }, "-=0.35")
          .from(".hero-subtitle", { opacity: 0, y: 24, duration: 0.6, ...heroFromDefaults }, "-=0.45")
          .from(
            ".hero-cta-link",
            { opacity: 0, y: 20, duration: 0.5, stagger: 0.12, ...heroFromDefaults },
            "-=0.35"
          )
          .from(".hero-demo", { opacity: 0, y: 18, duration: 0.5, ...heroFromDefaults }, "-=0.25");

        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".features-section",
              start: "top 80%",
              toggleActions: "play none none none",
            },
            defaults: { ease: "power3.out", ...scrollFromDefaults },
          })
          .from(".features-heading", { opacity: 0, y: 28, duration: 0.65 })
          .from(".feature-card", { opacity: 0, y: 36, duration: 0.6, stagger: 0.1 }, "-=0.35");

        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".how-section",
              start: "top 78%",
              toggleActions: "play none none none",
            },
            defaults: { ease: "power3.out", ...scrollFromDefaults },
          })
          .from(".how-copy > *", { opacity: 0, y: 24, duration: 0.55, stagger: 0.08 })
          .from(".how-step", { opacity: 0, x: -28, duration: 0.6, stagger: 0.12 }, "-=0.25")
          .from(".how-image", { opacity: 0, x: 36, scale: 0.96, duration: 0.75 }, "-=0.45");

        gsap.from(".cta-content > *", {
          ...scrollFromDefaults,
          scrollTrigger: {
            trigger: ".cta-section",
            start: "top 85%",
            toggleActions: "play none none none",
          },
          opacity: 0,
          y: 24,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
        });

        ScrollTrigger.refresh();
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Logo priority imageClassName="max-h-12 sm:max-h-16" />
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/track"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white hover:bg-white/10 hover:text-white sm:h-8 sm:px-2.5 sm:text-sm"
              )}
            >
              Track Shipment
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-brand-blue font-semibold text-brand-navy hover:bg-brand-blue/90 sm:h-8 sm:px-2.5"
              )}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero-section relative isolate flex min-h-[min(100svh,920px)] items-center overflow-hidden text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-brand-navy bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${LANDING_IMAGES.hero}')` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-br from-brand-navy/95 via-brand-navy/88 to-brand-blue/45"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#37BAEE33,transparent_55%)]"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center lg:max-w-4xl">
            <div className="hero-badge mb-5 inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1.5 text-xs text-brand-blue sm:mb-6 sm:px-4 sm:text-sm">
              <Zap className="size-3.5 shrink-0" />
              Enterprise Logistics Platform
            </div>

            <h1 className="hero-title text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Move freight smarter with{" "}
              <span className="text-brand-blue">Oshus Freight Services</span>
            </h1>

            <p className="hero-subtitle mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg">
              End-to-end shipment management, real-time tracking, fleet operations, and billing all
              in one unified platform built for scale.
            </p>

            <div className="hero-cta mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "hero-cta-link w-full bg-brand-blue px-6 font-semibold text-white hover:bg-brand-blue/90 sm:w-auto sm:px-8"
                )}
              >
                Get Started
                <ArrowRight />
              </Link>
              <Link
                href="/track"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "hero-cta-link w-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white sm:w-auto sm:px-8"
                )}
              >
                Track a Shipment
              </Link>
            </div>

            <div className="hero-demo w-full sm:mt-8">
              <p className="mb-2 text-lg font-semibold text-white sm:text-xl">Try a demo tracking number</p>
              <Link
                href="/track?number=OSH-M2K9F8-A3B7"
                className="flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-mono text-brand-blue transition-colors hover:bg-white/10"
              >
                OSH-M2K9F8-A3B7
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="features-heading mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl lg:text-4xl">
              Everything you need to run logistics
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              From first mile to last mile — manage your entire supply chain with confidence.
            </p>
          </div>

          <div className="features-grid grid gap-4 sm:grid-cols-2 sm:gap-6">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="feature-card group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-brand-blue/30 hover:shadow-md sm:p-6"
              >
                <div className={cn("mb-4 inline-flex rounded-xl p-3", feature.color)}>
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-brand-navy sm:text-lg">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how-section bg-muted/50 py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="how-copy order-2 lg:order-1">
              <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl lg:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
                Three simple steps to move your freight from booking to delivery.
              </p>

              <div className="how-steps mt-8 flex flex-col gap-5 sm:mt-10 sm:gap-6">
                {steps.map((item) => (
                  <div key={item.step} className="how-step flex gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-lg font-bold text-brand-blue sm:size-14 sm:text-xl">
                      {item.step}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-semibold text-brand-navy sm:text-lg">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="how-image relative order-1 overflow-hidden rounded-2xl border border-border bg-brand-navy/10 shadow-lg lg:order-2"
              role="img"
              aria-label="Logistics team coordinating freight operations"
            >
              <div
                className="aspect-4/3 w-full bg-brand-navy/20 bg-cover bg-center sm:aspect-5/4 lg:aspect-4/5"
                style={{ backgroundImage: `url('${LANDING_IMAGES.howItWorks}')` }}
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-brand-navy/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-brand-navy px-6 py-12 text-center text-white sm:rounded-3xl sm:px-12 sm:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#37BAEE22,transparent_70%)]" />
            <div className="cta-content relative">
              <Globe className="mx-auto mb-4 size-9 text-brand-blue sm:size-10" />
              <h2 className="text-xl font-bold sm:text-2xl lg:text-3xl">
                Ready to streamline your logistics?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:text-base">
                Join Oshus Freight Services and take control of your supply chain today.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-brand-blue font-semibold text-brand-navy hover:bg-brand-blue/90 sm:w-auto"
                  )}
                >
                  Start Free
                  <ArrowRight />
                </Link>
                <Link
                  href="/track"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "w-full border-white/30 bg-white text-brand-navy hover:bg-white/10 sm:w-auto"
                  )}
                >
                  Track Shipment
                </Link>
              </div>
              <ul className="mt-8 flex flex-col gap-2 text-xs text-white/60 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2 sm:text-sm">
                {["No credit card required", "6 role-based portals", "Real-time tracking"].map((t) => (
                  <li key={t} className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="size-4 shrink-0 text-brand-blue" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-brand-navy py-8 text-center text-xs text-white/60 sm:text-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          © {new Date().getFullYear()} Oshus Freight Services. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
