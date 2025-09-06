"""
Rate limiting implementation using Upstash Redis with token bucket pattern
"""

import time
import json
from typing import Optional, Tuple
from datetime import datetime, timezone
import structlog
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import config

logger = structlog.get_logger()


class RateLimiter:
    """Token bucket rate limiter using Upstash Redis"""
    
    def __init__(self):
        """Initialize rate limiter"""
        self.enabled = config.rate_limit_enabled
        self.requests_per_minute = config.rate_limit_requests_per_minute
        self.burst_size = config.rate_limit_burst_size
        self.refill_rate = self.requests_per_minute / 60.0  # tokens per second
        
        # Upstash REST API configuration
        self.base_url = config.upstash_redis_rest_url
        self.token = config.upstash_redis_rest_token
        
        # Fallback to local rate limiting if Redis not configured
        self.use_local_fallback = not (self.base_url and self.token)
        self.local_tokens = self.burst_size
        self.local_last_refill = time.time()
        
        if self.use_local_fallback:
            logger.warning("rate_limiter_using_local_fallback",
                         reason="Upstash Redis not configured")
        else:
            logger.info("rate_limiter_initialized",
                       rpm=self.requests_per_minute,
                       burst=self.burst_size)
    
    def _make_redis_request(self, command: list) -> Optional[dict]:
        """Make a request to Upstash Redis REST API"""
        if self.use_local_fallback:
            return None
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        try:
            with httpx.Client() as client:
                response = client.post(
                    self.base_url,
                    headers=headers,
                    json=command,
                    timeout=5.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error("redis_request_failed", 
                        command=command[0] if command else None,
                        error=str(e))
            return None
    
    def _get_bucket_key(self, identifier: str = "global") -> str:
        """Get the Redis key for a rate limit bucket"""
        return f"rate_limit:{config.worker_id}:{identifier}"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=2)
    )
    async def acquire_token(self, identifier: str = "global", wait: bool = True) -> bool:
        """
        Acquire a token from the bucket
        
        Args:
            identifier: Bucket identifier (e.g., "global", "tiktok", etc.)
            wait: Whether to wait for a token if none available
        
        Returns:
            bool: True if token acquired, False otherwise
        """
        if not self.enabled:
            return True
        
        if self.use_local_fallback:
            return self._acquire_local_token(wait)
        
        return await self._acquire_redis_token(identifier, wait)
    
    def _acquire_local_token(self, wait: bool) -> bool:
        """Local fallback token acquisition"""
        current_time = time.time()
        
        # Refill tokens based on elapsed time
        elapsed = current_time - self.local_last_refill
        tokens_to_add = elapsed * self.refill_rate
        self.local_tokens = min(self.burst_size, self.local_tokens + tokens_to_add)
        self.local_last_refill = current_time
        
        if self.local_tokens >= 1:
            self.local_tokens -= 1
            return True
        
        if wait:
            # Calculate wait time for next token
            wait_time = (1 - self.local_tokens) / self.refill_rate
            logger.debug("rate_limit_waiting", wait_seconds=wait_time)
            time.sleep(wait_time)
            return self._acquire_local_token(False)
        
        return False
    
    async def _acquire_redis_token(self, identifier: str, wait: bool) -> bool:
        """Redis-based token acquisition"""
        bucket_key = self._get_bucket_key(identifier)
        current_time = time.time()
        
        # Lua script for atomic token bucket operations
        lua_script = """
        local key = KEYS[1]
        local burst_size = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local current_time = tonumber(ARGV[3])
        
        local bucket = redis.call('GET', key)
        local tokens, last_refill
        
        if bucket then
            local data = cjson.decode(bucket)
            tokens = data.tokens
            last_refill = data.last_refill
        else
            tokens = burst_size
            last_refill = current_time
        end
        
        -- Refill tokens
        local elapsed = current_time - last_refill
        local tokens_to_add = elapsed * refill_rate
        tokens = math.min(burst_size, tokens + tokens_to_add)
        
        -- Try to acquire token
        if tokens >= 1 then
            tokens = tokens - 1
            local new_data = cjson.encode({
                tokens = tokens,
                last_refill = current_time
            })
            redis.call('SET', key, new_data, 'EX', 3600)
            return 1
        else
            return 0
        end
        """
        
        # Execute Lua script via REST API
        command = [
            "EVAL",
            lua_script,
            1,
            bucket_key,
            str(self.burst_size),
            str(self.refill_rate),
            str(current_time)
        ]
        
        result = self._make_redis_request(command)
        
        if result is None:
            # Fallback to local rate limiting
            return self._acquire_local_token(wait)
        
        token_acquired = result.get("result", 0) == 1
        
        if not token_acquired and wait:
            # Calculate wait time for next token
            wait_time = 1.0 / self.refill_rate
            logger.debug("rate_limit_waiting", 
                        identifier=identifier,
                        wait_seconds=wait_time)
            time.sleep(wait_time)
            return await self._acquire_redis_token(identifier, False)
        
        return token_acquired
    
    async def get_remaining_tokens(self, identifier: str = "global") -> Tuple[float, float]:
        """
        Get remaining tokens and burst size
        
        Returns:
            Tuple of (remaining_tokens, burst_size)
        """
        if not self.enabled:
            return (float('inf'), float('inf'))
        
        if self.use_local_fallback:
            return (self.local_tokens, self.burst_size)
        
        bucket_key = self._get_bucket_key(identifier)
        command = ["GET", bucket_key]
        result = self._make_redis_request(command)
        
        if result is None or result.get("result") is None:
            return (self.burst_size, self.burst_size)
        
        try:
            data = json.loads(result["result"])
            current_time = time.time()
            elapsed = current_time - data["last_refill"]
            tokens_to_add = elapsed * self.refill_rate
            tokens = min(self.burst_size, data["tokens"] + tokens_to_add)
            return (tokens, self.burst_size)
        except Exception as e:
            logger.error("get_remaining_tokens_failed", error=str(e))
            return (self.burst_size, self.burst_size)
    
    async def reset_bucket(self, identifier: str = "global") -> bool:
        """Reset a rate limit bucket to full capacity"""
        if not self.enabled:
            return True
        
        if self.use_local_fallback:
            self.local_tokens = self.burst_size
            self.local_last_refill = time.time()
            return True
        
        bucket_key = self._get_bucket_key(identifier)
        data = json.dumps({
            "tokens": self.burst_size,
            "last_refill": time.time()
        })
        
        command = ["SET", bucket_key, data, "EX", 3600]
        result = self._make_redis_request(command)
        
        return result is not None and result.get("result") == "OK"
    
    async def health_check(self) -> bool:
        """Check if rate limiter is healthy"""
        if not self.enabled:
            return True
        
        if self.use_local_fallback:
            return True
        
        try:
            command = ["PING"]
            result = self._make_redis_request(command)
            return result is not None and result.get("result") == "PONG"
        except Exception as e:
            logger.error("rate_limiter_health_check_failed", error=str(e))
            return False


# Global rate limiter instance
rate_limiter = RateLimiter()