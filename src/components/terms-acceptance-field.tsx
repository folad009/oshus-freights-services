import Link from "next/link";
import { FileText } from "lucide-react";
import { TERMS_PDF_PATH } from "@/lib/terms";

type TermsAcceptanceFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function TermsAcceptanceField({ checked, onChange }: TermsAcceptanceFieldProps) {
  return (
    <div className="space-y-3 rounded-lg border p-3 text-base">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Terms and Conditions</p>
          <p className="text-sm text-muted-foreground">
            Review the full terms document before accepting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={TERMS_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted/50"
          >
            <FileText className="size-3.5" />
            View PDF
          </Link>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted/50"
          >
            Full page
          </Link>
        </div>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          I have read and agree to the{" "}
          <Link
            href={TERMS_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Terms and Conditions
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
