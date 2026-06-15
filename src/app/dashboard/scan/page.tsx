import { Suspense } from "react";
import ScanPageContent, { ScanPageFallback } from "./scan-content";

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanPageFallback />}>
      <ScanPageContent />
    </Suspense>
  );
}
