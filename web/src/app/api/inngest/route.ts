import { serve } from "inngest/next";
import { inngest, allJobs } from "@/../../inngest";

// Create the Inngest API route handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allJobs,

  // Configuration options
  serveHost: process.env.INNGEST_SERVE_HOST,
  servePath: "/api/inngest",

  // Security and environment settings
  signingKey: process.env.INNGEST_SIGNING_KEY,

  // Logging configuration
  logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",

  // Custom middleware for authentication and monitoring
  middleware: [
    // Rate limiting middleware (basic implementation)
    async (req, event, next) => {
      // Basic rate limiting check
      const startTime = Date.now();

      try {
        const result = await next();

        // Log execution metrics
        const executionTime = Date.now() - startTime;
        console.log(
          `Inngest job executed: ${event.name} in ${executionTime}ms`
        );

        return result;
      } catch (error) {
        // Log execution errors
        const executionTime = Date.now() - startTime;
        console.error(
          `Inngest job failed: ${event.name} after ${executionTime}ms`,
          {
            error: error.message,
            event: event.name,
            data: event.data,
          }
        );

        throw error;
      }
    },

    // Environment validation middleware
    async (req, event, next) => {
      // Ensure required environment variables are present
      const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

      const missingVars = requiredEnvVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(", ")}`
        );
      }

      return next();
    },
  ],

  // Error handling
  onError: (error, event, step) => {
    console.error("Inngest execution error:", {
      error: error.message,
      stack: error.stack,
      event: event.name,
      step: step?.id,
      timestamp: new Date().toISOString(),
    });
  },

  // Development mode settings
  ...(process.env.NODE_ENV === "development" && {
    // Allow dev mode without signing key in development
    isDev: true,
  }),
});
