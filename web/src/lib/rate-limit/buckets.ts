import { Ratelimit } from "@upstash/ratelimit";
import redis from "./redis";
import { getServerEnv } from "../../../lib/env";

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
};

export interface RateLimitAcquireOptions {
  identifier?: string;
  logger?: LoggerLike;
  label?: string;
  maxWaitMs?: number;
}

const env = getServerEnv();

// Ensure burst capacity is at most 1x RPM as requested
const discoveryTokensPerMinute = Math.max(0, Number(env.DISCOVERY_RPM || 0));
const commentsTokensPerMinute = Math.max(0, Number(env.COMMENTS_RPM || 0));
const httpEnrichmentTokensPerMinute = Math.max(
  0,
  Number(env.HTTP_ENRICH_RPM || 30)
);

const discoveryLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(
    discoveryTokensPerMinute,
    "1 m",
    discoveryTokensPerMinute
  ),
  analytics: true,
  prefix: "@upstash/ratelimit:mcp:discovery",
});

const commentsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(
    commentsTokensPerMinute,
    "1 m",
    commentsTokensPerMinute
  ),
  analytics: true,
  prefix: "@upstash/ratelimit:mcp:comments",
});

const httpEnrichmentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(
    httpEnrichmentTokensPerMinute,
    "1 m",
    httpEnrichmentTokensPerMinute
  ),
  analytics: true,
  prefix: "@upstash/ratelimit:http:enrichment",
});

function toMsFromReset(reset: number): number {
  // Upstash returns reset as a UNIX timestamp (seconds) or ms depending on runtime.
  // Normalize to milliseconds from now.
  const now = Date.now();
  const isSecondsEpoch = reset < 1_000_000_000_000; // heuristic
  const resetMs = isSecondsEpoch ? reset * 1000 : reset;
  return Math.max(0, resetMs - now);
}

function jitterMs(base: number): number {
  const jitter = 50 + Math.floor(Math.random() * 200); // 50-250ms
  return base + jitter;
}

async function acquireWithBackoff(
  limiter: Ratelimit,
  opts: RateLimitAcquireOptions
): Promise<{ remaining: number; limit: number; waitedMs: number }> {
  const { identifier = "global", logger, label = "token", maxWaitMs } = opts;
  const startedAt = Date.now();
  let totalWaitMs = 0;

  for (;;) {
    const { success, remaining, limit, reset } =
      await limiter.limit(identifier);

    if (success) {
      if (logger) {
        logger.info("rate_limit_acquire", {
          label,
          identifier,
          remaining,
          limit,
          waitedMs: totalWaitMs,
        });
      }
      return { remaining, limit, waitedMs: totalWaitMs };
    }

    const waitBaseMs = toMsFromReset(reset);
    const waitMs = jitterMs(waitBaseMs);

    if (logger) {
      logger.info("rate_limit_wait", {
        label,
        identifier,
        waitMs,
        remaining,
        limit,
      });
    }

    if (maxWaitMs !== null && maxWaitMs !== undefined) {
      const elapsed = Date.now() - startedAt;
      if (elapsed + waitMs > maxWaitMs) {
        // Respect maxWaitMs guard if provided
        throw new Error(
          `Rate limit wait exceeded maxWaitMs for ${label} (elapsed=${elapsed}ms, nextWait=${waitMs}ms)`
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    totalWaitMs += waitMs;
  }
}

export async function acquireDiscoveryToken(
  opts: RateLimitAcquireOptions = {}
): Promise<{ remaining: number; limit: number; waitedMs: number }> {
  return acquireWithBackoff(discoveryLimiter, {
    ...opts,
    label: opts.label ?? "discovery",
  });
}

export async function acquireCommentsToken(
  opts: RateLimitAcquireOptions = {}
): Promise<{ remaining: number; limit: number; waitedMs: number }> {
  return acquireWithBackoff(commentsLimiter, {
    ...opts,
    label: opts.label ?? "comments",
  });
}

export async function acquireHttpEnrichmentToken(
  opts: RateLimitAcquireOptions = {}
): Promise<{ remaining: number; limit: number; waitedMs: number }> {
  return acquireWithBackoff(httpEnrichmentLimiter, {
    ...opts,
    label: opts.label ?? "http_enrich",
  });
}
