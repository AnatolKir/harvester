import { scraperLimiter, workerLimiter, checkRateLimit } from "./limiter";
import { logRateLimitEvent } from "./monitoring";

export interface WorkerRateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  backoffMultiplier: number;
  maxBackoffSeconds: number;
}

const DEFAULT_CONFIG: WorkerRateLimitConfig = {
  maxRequestsPerMinute: 30,
  maxConcurrentRequests: 2,
  backoffMultiplier: 2,
  maxBackoffSeconds: 60,
};

export class WorkerRateLimiter {
  private config: WorkerRateLimitConfig;
  private currentBackoff: number = 0;
  private lastRateLimitHit: number = 0;
  private concurrentRequests: number = 0;

  constructor(config: Partial<WorkerRateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async canMakeRequest(workerId: string): Promise<boolean> {
    if (this.concurrentRequests >= this.config.maxConcurrentRequests) {
      console.log(`Worker ${workerId}: Max concurrent requests reached`);
      return false;
    }

    if (this.currentBackoff > 0) {
      const timeSinceLastHit = Date.now() - this.lastRateLimitHit;
      if (timeSinceLastHit < this.currentBackoff * 1000) {
        console.log(
          `Worker ${workerId}: In backoff period (${this.currentBackoff}s remaining)`
        );
        return false;
      } else {
        this.currentBackoff = 0;
      }
    }

    const result = await checkRateLimit(workerLimiter, workerId);

    await logRateLimitEvent({
      identifier: workerId,
      endpoint: "worker:tiktok",
      timestamp: Date.now(),
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
    });

    if (!result.success) {
      this.handleRateLimitHit();
      return false;
    }

    return true;
  }

  async executeWithRateLimit<T>(
    workerId: string,
    operation: () => Promise<T>
  ): Promise<T | null> {
    const canProceed = await this.canMakeRequest(workerId);

    if (!canProceed) {
      return null;
    }

    this.concurrentRequests++;

    try {
      const result = await operation();
      this.handleSuccess();
      return result;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.handleRateLimitHit();
      }
      throw error;
    } finally {
      this.concurrentRequests--;
    }
  }

  private handleRateLimitHit(): void {
    this.lastRateLimitHit = Date.now();

    if (this.currentBackoff === 0) {
      this.currentBackoff = 1;
    } else {
      this.currentBackoff = Math.min(
        this.currentBackoff * this.config.backoffMultiplier,
        this.config.maxBackoffSeconds
      );
    }

    console.log(
      `Rate limit hit. Backing off for ${this.currentBackoff} seconds`
    );
  }

  private handleSuccess(): void {
    if (this.currentBackoff > 0) {
      this.currentBackoff = Math.max(1, this.currentBackoff / 2);
    }
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.code === "RATE_LIMIT_EXCEEDED" ||
      error?.message?.toLowerCase().includes("rate limit")
    );
  }

  async waitForBackoff(): Promise<void> {
    if (this.currentBackoff > 0) {
      const waitTime = this.currentBackoff * 1000;
      console.log(`Waiting ${this.currentBackoff}s due to rate limiting...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  getBackoffStatus(): {
    inBackoff: boolean;
    secondsRemaining: number;
    concurrentRequests: number;
  } {
    const secondsRemaining =
      this.currentBackoff > 0
        ? Math.max(
            0,
            this.currentBackoff - (Date.now() - this.lastRateLimitHit) / 1000
          )
        : 0;

    return {
      inBackoff: secondsRemaining > 0,
      secondsRemaining: Math.ceil(secondsRemaining),
      concurrentRequests: this.concurrentRequests,
    };
  }
}

export async function checkTikTokScraperLimit(
  identifier: string
): Promise<boolean> {
  const result = await checkRateLimit(scraperLimiter, identifier);

  await logRateLimitEvent({
    identifier,
    endpoint: "scraper:tiktok",
    timestamp: Date.now(),
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
  });

  return result.success;
}
