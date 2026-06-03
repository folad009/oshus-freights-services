import { auth } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/rbac";
import { UserRole } from "@/types/enums";
import { NextResponse } from "next/server";

const publicRoutes = ["/", "/login", "/track"];
const authRoutes = ["/login"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith("/track/")
  );
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isDashboard = nextUrl.pathname.startsWith("/dashboard");

  if (isApiRoute) return;

  const role = req.auth?.user?.role as UserRole | undefined;
  const dashboardPath = role ? ROLE_DASHBOARD_PATH[role] : null;

  if (isAuthRoute && isLoggedIn && dashboardPath) {
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }

  if (!isLoggedIn && (isDashboard || (!isPublicRoute && !isAuthRoute))) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/" && dashboardPath) {
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
