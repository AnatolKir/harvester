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

  // Development mode settings
  ...(process.env.NODE_ENV === "development" && {
    // Allow dev mode without signing key in development
    isDev: true,
  }),
});
