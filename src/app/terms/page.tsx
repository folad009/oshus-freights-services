import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TERMS_VERSION } from "@/lib/billing";
import { TERMS_PDF_PATH } from "@/lib/terms";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand-navy px-4 py-4 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Logo href="/" imageClassName="max-h-12" />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={TERMS_PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "border-white/30 bg-transparent text-white hover:bg-white/10")}
            >
              Open PDF
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "bg-brand-blue text-brand-navy")}>
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Terms and Conditions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Version {TERMS_VERSION}</p>
          </div>
          <Link
            href={TERMS_PDF_PATH}
            download
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            Download PDF
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Read the document below before accepting terms when booking a shipment.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
          <iframe
            src={TERMS_PDF_PATH}
            title="Oshus Freight Terms and Conditions"
            className="h-[min(75vh,900px)] w-full bg-white"
          />
        </div>
      </main>
    </div>
  );
}
