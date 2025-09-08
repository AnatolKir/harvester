/**
 * Tests for token bucket helpers with contention and backoff behavior
 */

jest.mock("@upstash/ratelimit", () => {
  const queues = new Map<string, Array<any>>();
  class Ratelimit {
    static tokenBucket() {
      return {} as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_: any) {}
    limit(identifier: string) {
      const queue = queues.get(identifier) || [];
      if (queue.length === 0) {
        return Promise.resolve({
          success: true,
          remaining: 1,
          limit: 1,
          reset: Date.now(),
        });
      }
      const res = queue.shift();
      queues.set(identifier, queue);
      return Promise.resolve(res);
    }
  }
  return { Ratelimit, __queues: queues };
});

// Mock env to avoid validating full web/lib/env.ts
jest.mock("../../../../lib/env", () => ({
  getServerEnv: () => ({
    DISCOVERY_RPM: 30,
    COMMENTS_RPM: 60,
  }),
}));

// Import after mocks
import { acquireCommentsToken, acquireDiscoveryToken } from "../buckets";

describe("token bucket helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("acquires immediately when token available", async () => {
    const result = await acquireDiscoveryToken({ identifier: "global" });
    expect(result.limit).toBeGreaterThan(0);
    expect(result.waitedMs).toBe(0);
  });

  test("waits with jitter when token unavailable, then acquires", async () => {
    const mocked = jest.requireMock("@upstash/ratelimit");
    const queues: Map<string, Array<any>> = mocked.__queues as Map<string, Array<any>>;

    const now = Date.now();
    queues.set("global", [
      { success: false, remaining: 0, limit: 10, reset: now + 10 },
      { success: true, remaining: 9, limit: 10, reset: now + 60_000 },
    ]);

    const promise = acquireCommentsToken({ identifier: "global" });
    await jest.advanceTimersByTimeAsync(10000);
    const result = await promise;
    expect(result.limit).toBe(10);
    expect(result.waitedMs).toBeGreaterThanOrEqual(50);
    expect(result.waitedMs).toBeLessThan(5000);
  });
});


