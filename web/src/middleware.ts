import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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
          cookiesToSet.forEach(({ name, value, options }) =>
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

  // Define route patterns
  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage = pathname === "/" || pathname.startsWith("/public");
  const isApiRoute = pathname.startsWith("/api");
  const isProtectedRoute = !isAuthPage && !isPublicPage && !isApiRoute;

  // Handle authentication logic
  if (!user && isProtectedRoute) {
    // Redirect unauthenticated users to login page
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    // Redirect authenticated users away from auth pages
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const redirectUrl = new URL(redirectTo || "/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
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
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  return response;
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
