// Export Supabase clients
export { createClient } from "./client";
export { createClient as createServerClient } from "./server";

// Export authentication functions
export { auth, serverAuth, authUtils } from "./auth";
export type { AuthResponse, SignUpData, SignInData } from "./auth";

// Export authentication hooks
export {
  useAuth,
  useUser,
  useSession,
  useIsAuthenticated,
  useAuthStatus,
  useAuthError,
} from "./hooks";
export type { AuthState, UseAuthReturn } from "./hooks";

// Export session management
export { sessionManager } from "./session";
export type { SessionState } from "./session";

// Export route guards
export {
  RouteGuard,
  withAuth,
  AuthRequired,
  AuthNotRequired,
} from "./route-guard";

// Re-export types from index for convenience
export type {
  // Auth types
  AuthUser,
  AuthSession,
  SignUpCredentials,
  SignInCredentials,
  AuthError,
  AuthContextType,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,

  // Form types
  SignInFormData,
  SignUpFormData,
  ResetPasswordFormData,
  UpdatePasswordFormData,

  // Route protection types
  ProtectedRouteProps,
  RouteGuardProps,
} from "@/types";
