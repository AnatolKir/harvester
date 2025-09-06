import { createClient } from "./client";
import { createClient as createServerClient } from "./server";
import type { AuthError, User } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Client-side authentication functions
export const auth = {
  /**
   * Sign up a new user with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Redirect to confirmation page after signup
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return {
      user: authData.user,
      error,
    };
  },

  /**
   * Sign in an existing user with email and password
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    return {
      user: authData.user,
      error,
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current user (client-side)
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    return {
      user: data.user,
      error,
    };
  },

  /**
   * Get the current session (client-side)
   */
  async getSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error,
    };
  },

  /**
   * Reset password for a user
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  },

  /**
   * Update user password
   */
  async updatePassword(password: string): Promise<AuthResponse> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    return {
      user: data.user,
      error,
    };
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Server-side authentication functions
export const serverAuth = {
  /**
   * Get the current user (server-side)
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    return {
      user: data.user,
      error,
    };
  },

  /**
   * Get the current session (server-side)
   */
  async getSession() {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error,
    };
  },
};

// Utility functions
export const authUtils = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated(user: User | null): boolean {
    return user !== null;
  },

  /**
   * Get user display name (fallback to email)
   */
  getUserDisplayName(user: User | null): string {
    if (!user) return "";
    return user.user_metadata?.display_name || user.email || "";
  },

  /**
   * Check if email is confirmed
   */
  isEmailConfirmed(user: User | null): boolean {
    return user?.email_confirmed_at !== null;
  },

  /**
   * Format auth error for display
   */
  formatAuthError(error: AuthError | null): string {
    if (!error) return "";

    switch (error.message) {
      case "Invalid login credentials":
        return "Invalid email or password. Please try again.";
      case "Email not confirmed":
        return "Please check your email and click the confirmation link.";
      case "User already registered":
        return "An account with this email already exists.";
      case "Password should be at least 6 characters":
        return "Password must be at least 6 characters long.";
      default:
        return error.message;
    }
  },
};
