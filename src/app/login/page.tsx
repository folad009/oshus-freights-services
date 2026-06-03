import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8">
          <Skeleton className="h-96 w-full max-w-md" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
