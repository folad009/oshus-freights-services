import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PaystackCallbackContent } from "./callback-content";

export default function PaystackCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
          <Loader2 className="mb-3 size-10 animate-spin text-brand-blue" />
          <h1 className="text-2xl font-semibold">Verifying payment</h1>
          <p className="mt-2 text-muted-foreground">Please wait...</p>
        </div>
      }
    >
      <PaystackCallbackContent />
    </Suspense>
  );
}
