"""
Configuration management for TikTok Domain Harvester Worker
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class WorkerConfig(BaseSettings):
    """Worker configuration with environment variable support"""
    
    # Supabase Configuration
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_service_key: str = Field(..., env="SUPABASE_SERVICE_KEY")
    
    # Redis/Upstash Configuration for Rate Limiting
    upstash_redis_rest_url: Optional[str] = Field(None, env="UPSTASH_REDIS_REST_URL")
    upstash_redis_rest_token: Optional[str] = Field(None, env="UPSTASH_REDIS_REST_TOKEN")
    
    # Worker Configuration
    worker_id: str = Field(default_factory=lambda: os.getenv("WORKER_ID", "worker-1"))
    worker_environment: str = Field(default="development", env="WORKER_ENV")
    max_concurrent_browsers: int = Field(default=1, env="MAX_CONCURRENT_BROWSERS")
    browser_headless: bool = Field(default=True, env="BROWSER_HEADLESS")
    
    # TikTok Scraping Configuration
    tiktok_base_url: str = Field(default="https://www.tiktok.com", env="TIKTOK_BASE_URL")
    max_comment_pages: int = Field(default=2, env="MAX_COMMENT_PAGES")
    comments_per_page: int = Field(default=50, env="COMMENTS_PER_PAGE")
    scrape_timeout: int = Field(default=30000, env="SCRAPE_TIMEOUT")  # milliseconds
    navigation_timeout: int = Field(default=60000, env="NAVIGATION_TIMEOUT")  # milliseconds
    
    # Rate Limiting Configuration
    rate_limit_enabled: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    rate_limit_requests_per_minute: int = Field(default=30, env="RATE_LIMIT_RPM")
    rate_limit_burst_size: int = Field(default=10, env="RATE_LIMIT_BURST")
    
    # Retry Configuration
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    retry_delay_seconds: float = Field(default=1.0, env="RETRY_DELAY")
    retry_backoff_factor: float = Field(default=2.0, env="RETRY_BACKOFF")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")  # json or console
    
    # Health Check Configuration
    health_check_port: int = Field(default=8080, env="HEALTH_CHECK_PORT")
    health_check_enabled: bool = Field(default=True, env="HEALTH_CHECK_ENABLED")
    
    # Proxy Configuration (optional)
    proxy_url: Optional[str] = Field(None, env="PROXY_URL")
    proxy_username: Optional[str] = Field(None, env="PROXY_USERNAME")
    proxy_password: Optional[str] = Field(None, env="PROXY_PASSWORD")
    
    @validator("log_level")
    def validate_log_level(cls, v):
        """Validate log level"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v.upper()
    
    @validator("worker_environment")
    def validate_environment(cls, v):
        """Validate worker environment"""
        valid_envs = ["development", "staging", "production"]
        if v.lower() not in valid_envs:
            raise ValueError(f"Environment must be one of {valid_envs}")
        return v.lower()
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.worker_environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.worker_environment == "development"
    
    @property
    def proxy_config(self) -> Optional[dict]:
        """Get proxy configuration for Playwright"""
        if not self.proxy_url:
            return None
        
        config = {"server": self.proxy_url}
        if self.proxy_username and self.proxy_password:
            config["username"] = self.proxy_username
            config["password"] = self.proxy_password
        
        return config
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global config instance
config = WorkerConfig()