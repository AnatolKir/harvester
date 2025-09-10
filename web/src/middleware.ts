import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  applySecurityHeaders,
  buildSecurityHeaders,
} from "./lib/security/headers";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Check user approval status if logged in
  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("status, role")
      .eq("user_id", user.id)
      .single();
    userProfile = data;
  }

  // Prepare security headers helper
  const securityHeaders = buildSecurityHeaders(request);
  const withHeaders = (res: NextResponse) =>
    applySecurityHeaders(res, securityHeaders);

  // Redirect magic-link page to login (since login now uses magic link)
  if (pathname === "/auth/magic-link") {
    return withHeaders(
      NextResponse.redirect(new URL("/auth/login", request.url))
    );
  }

  // Define route patterns
  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage = pathname.startsWith("/public");
  const isApiRoute = pathname.startsWith("/api");
  const isPendingPage = pathname === "/auth/pending-approval";
  const isProtectedRoute = !isAuthPage && !isPublicPage && !isApiRoute;

  // Handle authentication logic
  if (!user && isProtectedRoute) {
    // Redirect unauthenticated users to login page
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return withHeaders(NextResponse.redirect(redirectUrl));
  }

  // Check if user is pending or rejected
  if (user && userProfile) {
    if (userProfile.status === "pending" && !isPendingPage && !isAuthPage) {
      // Redirect pending users to pending approval page
      return withHeaders(
        NextResponse.redirect(new URL("/auth/pending-approval", request.url))
      );
    }
    if (userProfile.status === "rejected" && pathname !== "/auth/rejected") {
      // Redirect rejected users to rejection page
      return withHeaders(
        NextResponse.redirect(new URL("/auth/rejected", request.url))
      );
    }
  }

  if (user && isAuthPage) {
    // Redirect authenticated users away from auth pages
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const redirectUrl = new URL(redirectTo || "/", request.url);
    return withHeaders(NextResponse.redirect(redirectUrl));
  }

  // Handle API routes that require authentication
  if (isApiRoute && pathname !== "/api/auth/callback") {
    // Most API routes require authentication except for auth callback
    const protectedApiRoutes = [
      "/api/domains",
      "/api/videos",
      "/api/comments",
      "/api/dashboard",
    ];

    const requiresAuth = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (requiresAuth && !user) {
      const unauthorized = NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
      return withHeaders(unauthorized);
    }
  }

  return withHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
