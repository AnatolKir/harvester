import { createClient as createServerClient } from "./server";
import type { AuthError, User } from "@supabase/supabase-js";

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
