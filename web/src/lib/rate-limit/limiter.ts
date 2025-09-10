import { Ratelimit } from "@upstash/ratelimit";
import redis from "./redis";

export const globalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(100, "1 m", 100),
  analytics: true,
  prefix: "@upstash/ratelimit:global",
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(10, "10 s", 10),
  analytics: true,
  prefix: "@upstash/ratelimit:api",
});

export const authApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(30, "10 s", 30),
  analytics: true,
  prefix: "@upstash/ratelimit:api:auth",
});

export const scraperLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(5, "1 m", 5),
  analytics: true,
  prefix: "@upstash/ratelimit:scraper",
});

export const workerLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(2, "1 s", 5),
  analytics: true,
  prefix: "@upstash/ratelimit:worker",
});

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitConfig {
  interval: string;
  limit: number;
}

export async function checkRateLimitWithLimiter(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResponse> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}

// Convenience function that uses globalLimiter by default
export async function checkRateLimit(
  identifier: string,
  config?: RateLimitConfig
): Promise<RateLimitResponse> {
  // If custom config is provided, create a temporary limiter
  if (config) {
    const customLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(
        config.limit,
        config.interval,
        config.limit
      ),
      analytics: true,
      prefix: `@upstash/ratelimit:custom:${identifier}`,
    });

    return checkRateLimitWithLimiter(customLimiter, identifier);
  }

  // Use global limiter by default
  return checkRateLimitWithLimiter(globalLimiter, identifier);
}
