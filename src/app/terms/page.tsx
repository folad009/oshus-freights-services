import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TERMS_VERSION } from "@/lib/billing";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand-navy px-4 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Logo href="/" imageClassName="max-h-12" />
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "bg-brand-blue text-brand-navy")}>
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-navy">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Version {TERMS_VERSION}</p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground">
          <p>
            By creating a shipment with Oshus Freight Services, you agree to the following terms
            governing carriage, billing, and optional services.
          </p>

          <h2 className="text-lg font-semibold text-brand-navy">Shipment services</h2>
          <p>
            Quoted freight charges cover standard carriage from origin hub to destination hub unless
            door pickup or door delivery is explicitly selected. Door pickup and door delivery are
            optional add-on services billed separately from base freight.
          </p>

          <h2 className="text-lg font-semibold text-brand-navy">Insurance</h2>
          <p>
            Optional cargo insurance is available when declared value is provided at booking. Premium
            is calculated from declared value and charged in addition to freight and any door service
            fees. Standard liability limits apply when insurance is not purchased.
          </p>

          <h2 className="text-lg font-semibold text-brand-navy">Customer responsibilities</h2>
          <ul className="list-disc pl-5">
            <li>Provide accurate package dimensions, weight, origin, and destination details.</li>
            <li>Ensure goods are properly packed and labeled for transport.</li>
            <li>Pay all invoices, including add-on service fees, by the stated due date.</li>
            <li>Comply with applicable customs, import, and export regulations.</li>
          </ul>

          <h2 className="text-lg font-semibold text-brand-navy">Prohibited items</h2>
          <p>
            Hazardous materials, illegal goods, perishable items without prior approval, and other
            restricted commodities may not be shipped. Oshus Freight Services reserves the right to
            refuse or hold shipments that violate these restrictions.
          </p>

          <h2 className="text-lg font-semibold text-brand-navy">Claims and liability</h2>
          <p>
            Claims for loss or damage must be reported promptly with supporting documentation.
            Liability is limited to the lesser of repair cost, replacement value, or applicable
            insurance coverage unless otherwise agreed in writing.
          </p>
        </div>
      </main>
    </div>
  );
}
