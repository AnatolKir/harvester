"""
Health check endpoint for worker monitoring
"""

import asyncio
from typing import Dict, Any
from datetime import datetime, timezone
from aiohttp import web
import structlog

from config import config
from database import db_client
from rate_limiter import rate_limiter
from browser import browser_manager

logger = structlog.get_logger()


class HealthCheckServer:
    """HTTP server for health checks and monitoring"""
    
    def __init__(self):
        """Initialize health check server"""
        self.app = web.Application()
        self.runner = None
        self.site = None
        self.start_time = datetime.now(timezone.utc)
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup HTTP routes"""
        self.app.router.add_get("/health", self.health_check)
        self.app.router.add_get("/ready", self.readiness_check)
        self.app.router.add_get("/live", self.liveness_check)
        self.app.router.add_get("/metrics", self.metrics)
    
    async def health_check(self, request: web.Request) -> web.Response:
        """
        Comprehensive health check endpoint
        Checks all critical components
        """
        checks = {}
        overall_healthy = True
        
        # Check database connection
        try:
            db_healthy = await db_client.health_check()
            checks["database"] = {
                "status": "healthy" if db_healthy else "unhealthy",
                "message": "Connected to Supabase" if db_healthy else "Database connection failed"
            }
            overall_healthy = overall_healthy and db_healthy
        except Exception as e:
            checks["database"] = {
                "status": "unhealthy",
                "message": str(e)
            }
            overall_healthy = False
        
        # Check rate limiter
        try:
            rate_limiter_healthy = await rate_limiter.health_check()
            checks["rate_limiter"] = {
                "status": "healthy" if rate_limiter_healthy else "unhealthy",
                "message": "Rate limiter operational" if rate_limiter_healthy else "Rate limiter failed"
            }
            # Rate limiter is not critical if using local fallback
            if not rate_limiter.use_local_fallback:
                overall_healthy = overall_healthy and rate_limiter_healthy
        except Exception as e:
            checks["rate_limiter"] = {
                "status": "unhealthy",
                "message": str(e)
            }
        
        # Check browser manager
        try:
            browser_healthy = await browser_manager.health_check()
            checks["browser"] = {
                "status": "healthy" if browser_healthy else "unhealthy",
                "message": "Browser operational" if browser_healthy else "Browser not connected"
            }
            overall_healthy = overall_healthy and browser_healthy
        except Exception as e:
            checks["browser"] = {
                "status": "unhealthy",
                "message": str(e)
            }
            overall_healthy = False
        
        # Calculate uptime
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        
        response_data = {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "worker_id": config.worker_id,
            "environment": config.worker_environment,
            "uptime_seconds": uptime,
            "checks": checks
        }
        
        status_code = 200 if overall_healthy else 503
        
        logger.info("health_check_performed",
                   status=response_data["status"],
                   checks=len(checks))
        
        return web.json_response(response_data, status=status_code)
    
    async def readiness_check(self, request: web.Request) -> web.Response:
        """
        Readiness check - indicates if worker is ready to accept jobs
        """
        # Check if browser is initialized and database is connected
        ready = (
            browser_manager.browser is not None and
            browser_manager.browser.is_connected() and
            await db_client.health_check()
        )
        
        response_data = {
            "ready": ready,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "worker_id": config.worker_id
        }
        
        status_code = 200 if ready else 503
        return web.json_response(response_data, status=status_code)
    
    async def liveness_check(self, request: web.Request) -> web.Response:
        """
        Liveness check - simple check to see if process is alive
        """
        response_data = {
            "alive": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "worker_id": config.worker_id
        }
        
        return web.json_response(response_data, status=200)
    
    async def metrics(self, request: web.Request) -> web.Response:
        """
        Metrics endpoint for monitoring
        """
        # Get rate limiter metrics
        remaining_tokens, burst_size = await rate_limiter.get_remaining_tokens()
        
        # Calculate uptime
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        
        metrics_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "worker_id": config.worker_id,
            "environment": config.worker_environment,
            "uptime_seconds": uptime,
            "rate_limiter": {
                "enabled": rate_limiter.enabled,
                "remaining_tokens": remaining_tokens,
                "burst_size": burst_size,
                "requests_per_minute": rate_limiter.requests_per_minute,
                "using_local_fallback": rate_limiter.use_local_fallback
            },
            "browser": {
                "max_concurrent": config.max_concurrent_browsers,
                "active_contexts": len(browser_manager.contexts),
                "headless": config.browser_headless
            },
            "scraping": {
                "max_comment_pages": config.max_comment_pages,
                "comments_per_page": config.comments_per_page,
                "timeout_ms": config.scrape_timeout
            }
        }
        
        logger.debug("metrics_requested", metrics=metrics_data)
        
        return web.json_response(metrics_data, status=200)
    
    async def start(self):
        """Start the health check server"""
        if not config.health_check_enabled:
            logger.info("health_check_server_disabled")
            return
        
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            
            self.site = web.TCPSite(
                self.runner,
                '0.0.0.0',
                config.health_check_port
            )
            
            await self.site.start()
            
            logger.info("health_check_server_started",
                       port=config.health_check_port,
                       worker_id=config.worker_id)
        except Exception as e:
            logger.error("health_check_server_start_failed", error=str(e))
            raise
    
    async def stop(self):
        """Stop the health check server"""
        try:
            if self.site:
                await self.site.stop()
            
            if self.runner:
                await self.runner.cleanup()
            
            logger.info("health_check_server_stopped")
        except Exception as e:
            logger.error("health_check_server_stop_failed", error=str(e))


# Global health check server instance
health_server = HealthCheckServer()