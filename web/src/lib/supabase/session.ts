"use client";

import { createClient } from "./client";
import type { Session, AuthError } from "@supabase/supabase-js";

export interface SessionState {
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

/**
 * Session management utilities
 */
export const sessionManager = {
  /**
   * Initialize session and set up automatic refresh
   */
  async initialize(): Promise<SessionState> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, loading: false, error };
      }

      return {
        session: data.session,
        loading: false,
        error: null,
      };
    } catch (error) {
      return {
        session: null,
        loading: false,
        error: error as AuthError,
      };
    }
  },

  /**
   * Refresh the current session
   */
  async refresh(): Promise<{
    session: Session | null;
    error: AuthError | null;
  }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.refreshSession();

      return {
        session: data.session,
        error,
      };
    } catch (error) {
      return {
        session: null,
        error: error as AuthError,
      };
    }
  },

  /**
   * Check if session is expired or about to expire
   */
  isSessionExpired(session: Session | null): boolean {
    if (!session) return true;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;

    // Consider session expired if it expires within the next 5 minutes
    const bufferTime = 5 * 60; // 5 minutes in seconds

    return now >= expiresAt - bufferTime;
  },

  /**
   * Get time until session expires (in seconds)
   */
  getTimeUntilExpiry(session: Session | null): number {
    if (!session || !session.expires_at) return 0;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;

    return Math.max(0, expiresAt - now);
  },

  /**
   * Set up automatic session refresh
   * Returns cleanup function to clear the interval
   */
  setupAutoRefresh(
    session: Session | null,
    onRefresh: (session: Session | null, error: AuthError | null) => void
  ): () => void {
    if (!session || !session.expires_at) {
      return () => {}; // No cleanup needed
    }

    const timeUntilExpiry = this.getTimeUntilExpiry(session);

    // Refresh 5 minutes before expiry
    const refreshTime = Math.max(1000, (timeUntilExpiry - 300) * 1000);

    const timeoutId = setTimeout(async () => {
      const { session: newSession, error } = await this.refresh();
      onRefresh(newSession, error);

      // Set up next refresh if successful
      if (newSession && !error) {
        const cleanup = this.setupAutoRefresh(newSession, onRefresh);
        // Store cleanup function on window for global access if needed
        (window as any).__sessionRefreshCleanup = cleanup;
      }
    }, refreshTime);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  },

  /**
   * Handle session expiry
   */
  async handleExpiredSession(): Promise<void> {
    const supabase = createClient();

    // Clear any stored session data
    await supabase.auth.signOut();

    // Redirect to login page
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const redirectUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
      window.location.href = redirectUrl;
    }
  },

  /**
   * Validate current session and refresh if needed
   */
  async validateAndRefreshSession(): Promise<{
    session: Session | null;
    error: AuthError | null;
    refreshed: boolean;
  }> {
    const { session: currentSession } = await this.initialize();

    if (!currentSession) {
      return { session: null, error: null, refreshed: false };
    }

    if (this.isSessionExpired(currentSession)) {
      const { session: refreshedSession, error } = await this.refresh();

      if (error) {
        await this.handleExpiredSession();
        return { session: null, error, refreshed: false };
      }

      return {
        session: refreshedSession,
        error: null,
        refreshed: true,
      };
    }

    return {
      session: currentSession,
      error: null,
      refreshed: false,
    };
  },

  /**
   * Get session info for debugging
   */
  getSessionInfo(session: Session | null) {
    if (!session) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: 0,
        isExpired: true,
      };
    }

    const timeUntilExpiry = this.getTimeUntilExpiry(session);
    const isExpired = this.isSessionExpired(session);

    return {
      isValid: !isExpired,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : null,
      timeUntilExpiry,
      isExpired,
      accessToken: session.access_token
        ? "***" + session.access_token.slice(-4)
        : null,
      refreshToken: session.refresh_token
        ? "***" + session.refresh_token.slice(-4)
        : null,
    };
  },
};
