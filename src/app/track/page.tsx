import { Suspense } from "react";
import TrackPageContent from "./track-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
          <div className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}
