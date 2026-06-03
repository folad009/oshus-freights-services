"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Package, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        const message =
          result.error === "Configuration"
            ? "Authentication is not configured on the server. Please contact support."
            : "Invalid email or password";
        toast.error(message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-navy p-12 text-white">
        <div>
          <Logo href="/" priority imageClassName="max-h-14" />
          <p className="mt-4 text-brand-blue font-medium">Logistics Management Platform</p>
        </div>
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-4">
            <Package className="size-6 mt-1 shrink-0 text-brand-blue" />
            <div>
              <h3 className="font-semibold">End-to-End Shipment Management</h3>
              <p className="text-sm text-white/70 mt-1">
                Track shipments from draft to delivery with real-time visibility.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Globe className="size-6 mt-1 shrink-0 text-brand-blue" />
            <div>
              <h3 className="font-semibold">Multi-Role Operations</h3>
              <p className="text-sm text-white/70 mt-1">
                Unified platform for customers, drivers, warehouse staff, and finance teams.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} Oshus Freight Services. All rights reserved.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="lg:hidden">
          <Logo href="/" priority imageClassName="max-h-12" />
        </div>
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Demo: admin@oshus.com / password123
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
