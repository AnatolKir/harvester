"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "./hooks";
import type { RouteGuardProps } from "@/types";

/**
 * Client-side route guard component
 * Redirects unauthenticated users to sign-in page
 */
export function RouteGuard({ children, fallback }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      const redirectUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )
    );
  }

  // Show fallback or redirect (handled by useEffect)
  if (!isAuthenticated) {
    return fallback || null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

/**
 * Higher-order component for protecting pages
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <RouteGuard fallback={fallback}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

/**
 * Component that only renders children if user is authenticated
 */
export function AuthRequired({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStatus();

  if (isLoading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Component that only renders children if user is NOT authenticated
 */
export function AuthNotRequired({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuthStatus();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
