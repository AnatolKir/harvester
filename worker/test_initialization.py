"""
Test script to verify worker initialization
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

async def test_initialization():
    """Test worker component initialization"""
    
    print("=" * 60)
    print("Testing TikTok Domain Harvester Worker Initialization")
    print("=" * 60)
    
    # Test 1: Configuration loading
    print("\n1. Testing configuration...")
    try:
        from config import config
        print(f"✓ Configuration loaded")
        print(f"  - Worker ID: {config.worker_id}")
        print(f"  - Environment: {config.worker_environment}")
        print(f"  - Log Level: {config.log_level}")
    except Exception as e:
        print(f"✗ Configuration failed: {e}")
        return False
    
    # Test 2: Logging setup
    print("\n2. Testing logging...")
    try:
        from logger import logger
        logger.info("test_log_message", test=True)
        print("✓ Logging configured")
    except Exception as e:
        print(f"✗ Logging failed: {e}")
        return False
    
    # Test 3: Database client (if credentials available)
    print("\n3. Testing database client...")
    try:
        from database import db_client
        if config.supabase_url and config.supabase_service_key:
            health = await db_client.health_check()
            if health:
                print("✓ Database connection successful")
            else:
                print("⚠ Database connection failed (check credentials)")
        else:
            print("⚠ Skipping - Supabase credentials not configured")
    except Exception as e:
        print(f"⚠ Database test skipped: {e}")
    
    # Test 4: Rate limiter
    print("\n4. Testing rate limiter...")
    try:
        from rate_limiter import rate_limiter
        health = await rate_limiter.health_check()
        if health:
            print("✓ Rate limiter initialized")
            if rate_limiter.use_local_fallback:
                print("  - Using local fallback (Redis not configured)")
            else:
                print("  - Using Upstash Redis")
        else:
            print("⚠ Rate limiter health check failed")
    except Exception as e:
        print(f"✗ Rate limiter failed: {e}")
        return False
    
    # Test 5: Browser manager (basic check, don't launch browser)
    print("\n5. Testing browser manager...")
    try:
        from browser import BrowserManager
        test_manager = BrowserManager()
        print("✓ Browser manager created")
        print(f"  - Max concurrent: {config.max_concurrent_browsers}")
        print(f"  - Headless mode: {config.browser_headless}")
    except Exception as e:
        print(f"✗ Browser manager failed: {e}")
        return False
    
    # Test 6: Health server (don't start, just check import)
    print("\n6. Testing health server...")
    try:
        from health import HealthCheckServer
        test_server = HealthCheckServer()
        print("✓ Health server initialized")
        print(f"  - Port: {config.health_check_port}")
        print(f"  - Enabled: {config.health_check_enabled}")
    except Exception as e:
        print(f"✗ Health server failed: {e}")
        return False
    
    # Test 7: Environment validation
    print("\n7. Testing environment validation...")
    try:
        from main import validate_environment
        # This will exit if required vars are missing
        # We'll catch that and report it
        validate_environment()
        print("✓ All required environment variables present")
    except SystemExit:
        print("✗ Missing required environment variables")
        print("  Please check .env.example for required variables")
        return False
    except Exception as e:
        print(f"✗ Environment validation failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ All initialization tests passed!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    # Check if running in correct directory
    if not Path("config.py").exists():
        print("Error: Please run this test from the worker directory")
        sys.exit(1)
    
    # Run tests
    success = asyncio.run(test_initialization())
    sys.exit(0 if success else 1)