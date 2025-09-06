import redis from "./redis";

export interface RateLimitEvent {
  identifier: string;
  endpoint: string;
  timestamp: number;
  success: boolean;
  remaining: number;
  limit: number;
}

export interface AbusePattern {
  identifier: string;
  attempts: number;
  blockedAttempts: number;
  firstSeen: number;
  lastSeen: number;
}

const MONITORING_PREFIX = "rate-limit:monitoring";
const ABUSE_PREFIX = "rate-limit:abuse";
const EVENTS_TTL = 3600; // 1 hour
const ABUSE_TTL = 86400; // 24 hours

export async function logRateLimitEvent(event: RateLimitEvent): Promise<void> {
  const key = `${MONITORING_PREFIX}:${event.identifier}:${Date.now()}`;

  await redis.setex(key, EVENTS_TTL, JSON.stringify(event));

  if (!event.success) {
    await trackAbusePattern(event.identifier);
  }
}

async function trackAbusePattern(identifier: string): Promise<void> {
  const key = `${ABUSE_PREFIX}:${identifier}`;
  const existing = await redis.get<AbusePattern>(key);

  const pattern: AbusePattern = existing || {
    identifier,
    attempts: 0,
    blockedAttempts: 0,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
  };

  pattern.attempts++;
  pattern.blockedAttempts++;
  pattern.lastSeen = Date.now();

  await redis.setex(key, ABUSE_TTL, JSON.stringify(pattern));

  if (pattern.blockedAttempts > 10) {
    await alertHighAbuseRate(pattern);
  }
}

async function alertHighAbuseRate(pattern: AbusePattern): Promise<void> {
  console.error("High abuse rate detected:", {
    identifier: pattern.identifier,
    blockedAttempts: pattern.blockedAttempts,
    timeRange: `${pattern.firstSeen} - ${pattern.lastSeen}`,
  });

  const alertKey = `${MONITORING_PREFIX}:alerts:${pattern.identifier}`;
  await redis.setex(
    alertKey,
    3600,
    JSON.stringify({
      type: "high_abuse_rate",
      pattern,
      timestamp: Date.now(),
    })
  );
}

export async function getRateLimitMetrics(): Promise<{
  totalEvents: number;
  blockedRequests: number;
  abusePatterns: AbusePattern[];
}> {
  const eventKeys = await redis.keys(`${MONITORING_PREFIX}:*`);
  const abuseKeys = await redis.keys(`${ABUSE_PREFIX}:*`);

  let totalEvents = 0;
  let blockedRequests = 0;
  const abusePatterns: AbusePattern[] = [];

  for (const key of eventKeys) {
    const event = await redis.get<RateLimitEvent>(key);
    if (event) {
      totalEvents++;
      if (!event.success) {
        blockedRequests++;
      }
    }
  }

  for (const key of abuseKeys) {
    const pattern = await redis.get<AbusePattern>(key);
    if (pattern) {
      abusePatterns.push(pattern);
    }
  }

  return {
    totalEvents,
    blockedRequests,
    abusePatterns: abusePatterns.sort(
      (a, b) => b.blockedAttempts - a.blockedAttempts
    ),
  };
}

export async function clearOldMetrics(): Promise<void> {
  const cutoff = Date.now() - EVENTS_TTL * 1000;
  const keys = await redis.keys(`${MONITORING_PREFIX}:*`);

  for (const key of keys) {
    const parts = key.split(":");
    const timestamp = parseInt(parts[parts.length - 1]);

    if (timestamp < cutoff) {
      await redis.del(key);
    }
  }
}
