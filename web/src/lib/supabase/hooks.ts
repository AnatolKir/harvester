"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { auth, type SignInData, type SignUpData } from "./auth-client";
import { sessionManager } from "./session";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export interface UseAuthReturn extends AuthState {
  signIn: (data: SignInData) => Promise<{ error: AuthError | null }>;
  signUp: (data: SignUpData) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Main authentication hook that provides auth state and methods
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const mounted = useRef(true);

  // Safe state update that checks if component is still mounted
  const safeSetState = useCallback((newState: Partial<AuthState>) => {
    if (mounted.current) {
      setState((prev) => ({ ...prev, ...newState }));
    }
  }, []);

  // Initialize auth state and set up listener with auto-refresh
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let refreshCleanup: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // Validate and refresh session if needed
        const { session, error, refreshed } =
          await sessionManager.validateAndRefreshSession();

        if (error) {
          safeSetState({ error, loading: false });
          return;
        }

        safeSetState({
          user: session?.user ?? null,
          session,
          loading: false,
        });

        // Set up automatic session refresh
        if (session) {
          refreshCleanup = sessionManager.setupAutoRefresh(
            session,
            (newSession, refreshError) => {
              if (!mounted.current) return;

              if (refreshError) {
                safeSetState({ error: refreshError });
                return;
              }

              safeSetState({
                user: newSession?.user ?? null,
                session: newSession,
                error: null,
              });
            }
          );
        }

        // Set up auth state listener
        const authSubscription = auth.onAuthStateChange(async (event, session) => {
          if (!mounted.current) return;

          // Clear previous auto-refresh when session changes
          if (refreshCleanup) {
            refreshCleanup();
            refreshCleanup = null;
          }

          safeSetState({
            user: session?.user ?? null,
            session,
            loading: false,
            error: null,
          });

          // Set up new auto-refresh for new session
          if (session) {
            refreshCleanup = sessionManager.setupAutoRefresh(
              session,
              (newSession, refreshError) => {
                if (!mounted.current) return;

                if (refreshError) {
                  safeSetState({ error: refreshError });
                  return;
                }

                safeSetState({
                  user: newSession?.user ?? null,
                  session: newSession,
                  error: null,
                });
              }
            );
          }
        });
        
        subscription = authSubscription.data?.subscription || authSubscription;
      } catch (error) {
        safeSetState({
          error: error as AuthError,
          loading: false,
        });
      }
    };

    initAuth();

    // Cleanup
    return () => {
      mounted.current = false;
      subscription?.unsubscribe();
      if (refreshCleanup) {
        refreshCleanup();
      }
    };
  }, [safeSetState]);

  // Sign in method
  const signIn = useCallback(
    async (data: SignInData) => {
      safeSetState({ loading: true, error: null });

      const { error } = await auth.signIn(data);

      if (error) {
        safeSetState({ error, loading: false });
      }

      return { error };
    },
    [safeSetState]
  );

  // Sign up method
  const signUp = useCallback(
    async (data: SignUpData) => {
      safeSetState({ loading: true, error: null });

      const { error } = await auth.signUp(data);

      if (error) {
        safeSetState({ error, loading: false });
      }

      return { error };
    },
    [safeSetState]
  );

  // Sign out method
  const signOut = useCallback(async () => {
    safeSetState({ loading: true, error: null });

    const { error } = await auth.signOut();

    if (error) {
      safeSetState({ error, loading: false });
    }

    return { error };
  }, [safeSetState]);

  // Reset password method
  const resetPassword = useCallback(
    async (email: string) => {
      safeSetState({ loading: true, error: null });

      const { error } = await auth.resetPassword(email);

      safeSetState({ loading: false });

      if (error) {
        safeSetState({ error });
      }

      return { error };
    },
    [safeSetState]
  );

  // Update password method
  const updatePassword = useCallback(
    async (password: string) => {
      safeSetState({ loading: true, error: null });

      const { error } = await auth.updatePassword(password);

      if (error) {
        safeSetState({ error, loading: false });
      }

      return { error };
    },
    [safeSetState]
  );

  // Refresh auth state
  const refresh = useCallback(async () => {
    safeSetState({ loading: true, error: null });

    try {
      const { session, error } = await auth.getSession();

      if (error) {
        safeSetState({ error, loading: false });
        return;
      }

      safeSetState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    } catch (error) {
      safeSetState({
        error: error as AuthError,
        loading: false,
      });
    }
  }, [safeSetState]);

  // Clear error
  const clearError = useCallback(() => {
    safeSetState({ error: null });
  }, [safeSetState]);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refresh,
    clearError,
  };
}

/**
 * Hook that returns the current user
 */
export function useUser(): { user: User | null; loading: boolean } {
  const { user, loading } = useAuth();
  return { user, loading };
}

/**
 * Hook that returns the current session
 */
export function useSession(): { session: Session | null; loading: boolean } {
  const { session, loading } = useAuth();
  return { session, loading };
}

/**
 * Hook that checks if user is authenticated
 */
export function useIsAuthenticated(): {
  isAuthenticated: boolean;
  loading: boolean;
} {
  const { user, loading } = useAuth();
  return {
    isAuthenticated: user !== null,
    loading,
  };
}

/**
 * Hook for checking authentication status with loading state
 */
export function useAuthStatus(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
} {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: user !== null,
    isLoading: loading,
    user,
  };
}

/**
 * Hook that provides auth error state and clearing function
 */
export function useAuthError(): {
  error: AuthError | null;
  clearError: () => void;
  hasError: boolean;
} {
  const { error, clearError } = useAuth();

  return {
    error,
    clearError,
    hasError: error !== null,
  };
}
