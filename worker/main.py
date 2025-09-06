"""
Main entry point for the TikTok Domain Harvester Worker
"""

import asyncio
import signal
import sys
from typing import Optional
from datetime import datetime, timezone

from logger import logger
from config import config
from database import db_client
from rate_limiter import rate_limiter
from browser import browser_manager
from health import health_server


class Worker:
    """Main worker class that orchestrates all components"""
    
    def __init__(self):
        """Initialize worker"""
        self.running = False
        self.shutdown_event = asyncio.Event()
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        logger.info("worker_initialized",
                   worker_id=config.worker_id,
                   environment=config.worker_environment)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info("shutdown_signal_received", signal=signum)
        self.shutdown_event.set()
    
    async def initialize_components(self):
        """Initialize all worker components"""
        logger.info("initializing_worker_components")
        
        try:
            # Initialize browser manager
            logger.info("initializing_browser_manager")
            await browser_manager.initialize()
            
            # Test database connection
            logger.info("testing_database_connection")
            if not await db_client.health_check():
                raise Exception("Database connection failed")
            
            # Test rate limiter
            logger.info("testing_rate_limiter")
            if not await rate_limiter.health_check():
                logger.warning("rate_limiter_not_available",
                             using_fallback=rate_limiter.use_local_fallback)
            
            # Start health check server
            logger.info("starting_health_check_server")
            await health_server.start()
            
            logger.info("all_components_initialized_successfully")
            
        except Exception as e:
            logger.error("component_initialization_failed", error=str(e))
            raise
    
    async def cleanup_components(self):
        """Cleanup all worker components"""
        logger.info("cleaning_up_worker_components")
        
        try:
            # Stop health check server
            await health_server.stop()
            
            # Cleanup browser
            await browser_manager.cleanup()
            
            logger.info("all_components_cleaned_up")
            
        except Exception as e:
            logger.error("component_cleanup_failed", error=str(e))
    
    async def process_job(self, job_data: dict):
        """
        Process a single job
        This is a placeholder - actual scraping logic will be implemented separately
        """
        job_type = job_data.get("type", "unknown")
        logger.info("processing_job", job_type=job_type, job_data=job_data)
        
        # Acquire rate limit token
        if not await rate_limiter.acquire_token():
            logger.warning("rate_limit_exceeded", job_type=job_type)
            return
        
        # Process based on job type
        if job_type == "discover_videos":
            # Discovery logic will be implemented in discovery.py
            logger.info("discovery_job_placeholder")
        elif job_type == "harvest_comments":
            # Harvesting logic will be implemented in harvester.py
            logger.info("harvesting_job_placeholder")
        else:
            logger.warning("unknown_job_type", job_type=job_type)
    
    async def run_worker_loop(self):
        """Main worker loop"""
        logger.info("starting_worker_loop")
        self.running = True
        
        while self.running and not self.shutdown_event.is_set():
            try:
                # Check for shutdown
                if self.shutdown_event.is_set():
                    break
                
                # In production, this would poll for jobs from a queue
                # For now, we'll just sleep and log
                logger.debug("worker_loop_iteration",
                           timestamp=datetime.now(timezone.utc).isoformat())
                
                # Simulate work or wait for jobs
                await asyncio.sleep(10)
                
                # Example: Process a dummy job
                if config.is_development:
                    dummy_job = {
                        "type": "health_check",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await self.process_job(dummy_job)
                
            except Exception as e:
                logger.error("worker_loop_error", error=str(e))
                await asyncio.sleep(5)  # Brief pause before retrying
        
        logger.info("worker_loop_stopped")
        self.running = False
    
    async def run(self):
        """Main run method"""
        try:
            # Initialize components
            await self.initialize_components()
            
            # Run main loop
            await self.run_worker_loop()
            
        except Exception as e:
            logger.error("worker_fatal_error", error=str(e))
            sys.exit(1)
        finally:
            # Cleanup
            await self.cleanup_components()


def validate_environment():
    """Validate required environment variables"""
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not getattr(config, var.lower(), None):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error("missing_required_environment_variables",
                    variables=missing_vars)
        print(f"\nError: Missing required environment variables: {', '.join(missing_vars)}")
        print("\nPlease set the following environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nYou can set them in a .env file or export them in your shell.")
        sys.exit(1)
    
    # Warn about optional variables
    optional_vars = {
        "UPSTASH_REDIS_REST_URL": "Rate limiting will use local fallback",
        "UPSTASH_REDIS_REST_TOKEN": "Rate limiting will use local fallback",
        "PROXY_URL": "No proxy will be used for scraping"
    }
    
    for var, warning in optional_vars.items():
        if not getattr(config, var.lower(), None):
            logger.warning(f"optional_variable_not_set",
                         variable=var,
                         impact=warning)


async def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("TikTok Domain Harvester Worker Starting",
               version="1.0.0",
               worker_id=config.worker_id,
               environment=config.worker_environment)
    logger.info("=" * 60)
    
    # Validate environment
    validate_environment()
    
    # Create and run worker
    worker = Worker()
    await worker.run()
    
    logger.info("worker_shutdown_complete")


if __name__ == "__main__":
    # Run the async main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("worker_interrupted_by_user")
        sys.exit(0)
    except Exception as e:
        logger.error("worker_startup_failed", error=str(e))
        sys.exit(1)