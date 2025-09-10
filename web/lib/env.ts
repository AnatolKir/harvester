import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  WORKER_WEBHOOK_URL: z.string().url().optional(),
  
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_APP_ID: z.string().default('tiktok-harvester'),

  // Alerts / Slack
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_ALERTS_ENABLED: z.coerce.boolean().default(false),
  ALERTS_DRY_RUN: z.coerce.boolean().default(false).optional(),

  // MCP / Bright Data
  BRIGHTDATA_MCP_API_KEY: z.string().min(1),
  MCP_BASE_URL: z.string().url(),
  MCP_STICKY_SESSION_MINUTES: z.coerce.number().int().default(10),
  DISCOVERY_RPM: z.coerce.number().int().default(30),
  COMMENTS_RPM: z.coerce.number().int().default(60),
  HTTP_ENRICH_RPM: z.coerce.number().int().default(30),
  // Optional WHOIS API for enrichment
  WHOIS_API_URL: z.string().url().optional(),
  WHOIS_API_KEY: z.string().optional(),
  MATVIEWS_ENABLED: z.coerce.boolean().default(false),
  // MCP Circuit Breaker
  MCP_CB_FAILURE_THRESHOLD: z.coerce.number().int().default(5),
  MCP_CB_COOLDOWN_MS: z.coerce.number().int().default(60000),

  // Legacy (deprecated) Playwright proxy vars (kept for backward compatibility)
  PROXY_URL: z.string().optional(),
  PROXY_USERNAME: z.string().optional(),
  PROXY_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    WORKER_WEBHOOK_URL: process.env.WORKER_WEBHOOK_URL,
    
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_APP_ID: process.env.INNGEST_APP_ID,

    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    SLACK_ALERTS_ENABLED: process.env.SLACK_ALERTS_ENABLED,
    ALERTS_DRY_RUN: process.env.ALERTS_DRY_RUN,

    BRIGHTDATA_MCP_API_KEY: process.env.BRIGHTDATA_MCP_API_KEY || process.env.API_TOKEN,
    MCP_BASE_URL: process.env.MCP_BASE_URL || process.env.MCP_GATEWAY_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3333' : undefined as any),
    MCP_STICKY_SESSION_MINUTES: process.env.MCP_STICKY_SESSION_MINUTES,
    DISCOVERY_RPM: process.env.DISCOVERY_RPM,
    COMMENTS_RPM: process.env.COMMENTS_RPM,
    HTTP_ENRICH_RPM: process.env.HTTP_ENRICH_RPM,
    WHOIS_API_URL: process.env.WHOIS_API_URL,
    WHOIS_API_KEY: process.env.WHOIS_API_KEY,
    MATVIEWS_ENABLED: process.env.MATVIEWS_ENABLED,
    MCP_CB_FAILURE_THRESHOLD: process.env.MCP_CB_FAILURE_THRESHOLD,
    MCP_CB_COOLDOWN_MS: process.env.MCP_CB_COOLDOWN_MS,

    PROXY_URL: process.env.PROXY_URL,
    PROXY_USERNAME: process.env.PROXY_USERNAME,
    PROXY_PASSWORD: process.env.PROXY_PASSWORD,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

export function getPublicEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: env.NEXTAUTH_URL,
    WORKER_WEBHOOK_URL: env.WORKER_WEBHOOK_URL,
    INNGEST_EVENT_KEY: env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: env.INNGEST_SIGNING_KEY,
    INNGEST_APP_ID: env.INNGEST_APP_ID,

    // Alerts / Slack
    SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL,
    SLACK_ALERTS_ENABLED: env.SLACK_ALERTS_ENABLED,
    ALERTS_DRY_RUN: env.ALERTS_DRY_RUN,

    BRIGHTDATA_MCP_API_KEY: env.BRIGHTDATA_MCP_API_KEY,
    MCP_BASE_URL: env.MCP_BASE_URL,
    MCP_STICKY_SESSION_MINUTES: env.MCP_STICKY_SESSION_MINUTES,
    DISCOVERY_RPM: env.DISCOVERY_RPM,
    COMMENTS_RPM: env.COMMENTS_RPM,
    HTTP_ENRICH_RPM: env.HTTP_ENRICH_RPM,
    WHOIS_API_URL: env.WHOIS_API_URL,
    WHOIS_API_KEY: env.WHOIS_API_KEY,
    MATVIEWS_ENABLED: env.MATVIEWS_ENABLED,
    MCP_CB_FAILURE_THRESHOLD: env.MCP_CB_FAILURE_THRESHOLD,
    MCP_CB_COOLDOWN_MS: env.MCP_CB_COOLDOWN_MS,

    // Legacy proxy vars (deprecated)
    PROXY_URL: env.PROXY_URL,
    PROXY_USERNAME: env.PROXY_USERNAME,
    PROXY_PASSWORD: env.PROXY_PASSWORD,
  };
}

export function getWorkerEnv() {
  return {
    SUPABASE_URL: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isDevelopment() {
  return env.NODE_ENV === 'development';
}

export function isProduction() {
  return env.NODE_ENV === 'production';
}

export function isStaging() {
  return env.NODE_ENV === 'staging';
}