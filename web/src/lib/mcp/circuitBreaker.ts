import redis from "../rate-limit/redis";
import { getServerEnv } from "../../../lib/env";

type BreakerState = "closed" | "open" | "half-open";

export interface CircuitStatus {
  state: BreakerState;
  failureCount: number;
  openedAt?: number;
  nextTryAt?: number;
}

const KEY_PREFIX = "mcp:circuit";

function keys(name: string) {
  const base = `${KEY_PREFIX}:${name}`;
  return {
    state: `${base}:state`,
    failures: `${base}:failures`,
    openedAt: `${base}:opened_at`,
    nextTryAt: `${base}:next_try_at`,
  } as const;
}

export class CircuitBreaker {
  private name: string;
  private failureThreshold: number;
  private cooldownMs: number;

  constructor(
    name: string,
    opts?: { failureThreshold?: number; cooldownMs?: number }
  ) {
    const env = getServerEnv();
    this.name = name;
    this.failureThreshold =
      opts?.failureThreshold ?? Number(env.MCP_CB_FAILURE_THRESHOLD ?? 5);
    this.cooldownMs =
      opts?.cooldownMs ?? Number(env.MCP_CB_COOLDOWN_MS ?? 60000);
  }

  async getStatus(): Promise<CircuitStatus> {
    const k = keys(this.name);
    const values = await redis.mget<
      [string | null, string | null, string | null, string | null]
    >(k.state, k.failures, k.openedAt, k.nextTryAt);
    const [state, failures, openedAt, nextTryAt] = values;
    return {
      state: (state as BreakerState) || "closed",
      failureCount: failures ? parseInt(failures, 10) : 0,
      openedAt: openedAt ? parseInt(openedAt, 10) : undefined,
      nextTryAt: nextTryAt ? parseInt(nextTryAt, 10) : undefined,
    };
  }

  async canProceed(): Promise<boolean> {
    const s = await this.getStatus();
    if (s.state === "open") {
      const now = Date.now();
      if (s.nextTryAt && now >= s.nextTryAt) {
        // Move to half-open
        await this.setState("half-open");
        return true;
      }
      return false; // fast-fail
    }
    return true; // closed or half-open
  }

  async onSuccess(): Promise<void> {
    const s = await this.getStatus();
    if (s.state === "half-open") {
      // Close on first success
      await this.reset();
      return;
    }
    // In closed, successes just reset failures
    await this.resetFailures();
  }

  async onFailure(): Promise<void> {
    const k = keys(this.name);
    const failures = await redis.incr(k.failures);
    if (failures >= this.failureThreshold) {
      const now = Date.now();
      const nextTryAt = now + this.cooldownMs;
      await redis.mset({
        [k.state]: "open",
        [k.openedAt]: String(now),
        [k.nextTryAt]: String(nextTryAt),
      });
    }
  }

  private async setState(state: BreakerState): Promise<void> {
    const k = keys(this.name);
    await redis.set(k.state, state);
  }

  private async resetFailures(): Promise<void> {
    const k = keys(this.name);
    await redis.del(k.failures);
  }

  async reset(): Promise<void> {
    const k = keys(this.name);
    await redis.mdel(k.state, k.failures, k.openedAt, k.nextTryAt);
  }
}

let globalBreaker: CircuitBreaker | undefined;
export function getGlobalMcpBreaker(): CircuitBreaker {
  if (!globalBreaker) {
    globalBreaker = new CircuitBreaker("global");
  }
  return globalBreaker;
}
