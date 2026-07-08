import { auth } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/rbac";
import { UserRole } from "@/types/enums";
import { NextResponse } from "next/server";

const publicRoutes = ["/", "/login", "/track", "/terms"];
const authRoutes = ["/login"];

function isPublicPath(pathname: string) {
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith("/track/"))) {
    return true;
  }
  if (pathname.startsWith("/shipment-request/")) return true;
  return false;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublicRoute = isPublicPath(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  const role = req.auth?.user?.role as UserRole | undefined;
  const dashboardPath = role ? ROLE_DASHBOARD_PATH[role] : null;

  if (isAuthRoute && isLoggedIn && dashboardPath) {
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }

  if (!isLoggedIn && (!isPublicRoute && !isAuthRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/" && dashboardPath) {
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }
});

export const config = {
  // Exclude API routes so Auth.js handlers and other route handlers respond with JSON.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
