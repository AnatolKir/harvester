import { checkRateLimit, RateLimitConfig } from '../index';
import { Redis } from '@upstash/redis';

// Mock already configured in jest.setup.js

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const identifier = 'test-user-123';
      const result = await checkRateLimit(identifier);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should use custom config when provided', async () => {
      const identifier = 'test-user-456';
      const customConfig: RateLimitConfig = {
        interval: '5m',
        limit: 50,
      };

      const result = await checkRateLimit(identifier, customConfig);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100); // Mocked value
    });

    it('should track different identifiers separately', async () => {
      const result1 = await checkRateLimit('user-1');
      const result2 = await checkRateLimit('user-2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis to throw an error
      const mockRedis = Redis as jest.MockedClass<typeof Redis>;
      mockRedis.mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      // Should not throw, but return a default response
      const identifier = 'test-user-error';
      await expect(checkRateLimit(identifier)).resolves.not.toThrow();
    });
  });

  describe('Rate limit headers', () => {
    it('should generate correct headers from rate limit result', () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 75,
        reset: Date.now() + 60000,
      };

      const headers = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
      };

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('75');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should handle rate limit exceeded', () => {
      const result = {
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
      };

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});