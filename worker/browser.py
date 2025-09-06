"""
Playwright browser initialization and management
"""

import asyncio
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import structlog
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from tenacity import retry, stop_after_attempt, wait_exponential

from config import config

logger = structlog.get_logger()


class BrowserManager:
    """Manages Playwright browser instances and contexts"""
    
    def __init__(self):
        """Initialize browser manager"""
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.contexts: Dict[str, BrowserContext] = {}
        self.semaphore = asyncio.Semaphore(config.max_concurrent_browsers)
        
        # Browser launch arguments
        self.browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--window-size=1920,1080"
        ]
        
        # Additional stealth mode settings
        self.context_options = {
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "locale": "en-US",
            "timezone_id": "America/New_York",
            "permissions": ["geolocation"],
            "geolocation": {"latitude": 40.7128, "longitude": -74.0060},  # New York
            "color_scheme": "light",
            "device_scale_factor": 1,
            "is_mobile": False,
            "has_touch": False,
            "java_script_enabled": True,
            "accept_downloads": False,
            "bypass_csp": True,
            "ignore_https_errors": True
        }
    
    async def initialize(self):
        """Initialize Playwright and browser"""
        try:
            self.playwright = await async_playwright().start()
            await self._launch_browser()
            logger.info("browser_manager_initialized",
                       headless=config.browser_headless,
                       max_concurrent=config.max_concurrent_browsers)
        except Exception as e:
            logger.error("browser_manager_initialization_failed", error=str(e))
            raise
    
    async def _launch_browser(self):
        """Launch browser instance"""
        try:
            # Configure proxy if available
            launch_options = {
                "headless": config.browser_headless,
                "args": self.browser_args,
                "timeout": config.navigation_timeout
            }
            
            if config.proxy_config:
                launch_options["proxy"] = config.proxy_config
                logger.info("browser_using_proxy", proxy_url=config.proxy_url)
            
            # Launch Chromium browser
            self.browser = await self.playwright.chromium.launch(**launch_options)
            
            # Install stealth scripts
            await self._setup_stealth_mode()
            
            logger.info("browser_launched", headless=config.browser_headless)
        except Exception as e:
            logger.error("browser_launch_failed", error=str(e))
            raise
    
    async def _setup_stealth_mode(self):
        """Setup stealth mode to avoid detection"""
        if not self.browser:
            return
        
        # Add stealth init script
        stealth_js = """
        // Overwrite the navigator.webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Mock chrome runtime
        window.chrome = {
            runtime: {}
        };
        
        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
        """
        
        # This script will be injected into every new context
        self.context_options["extra_http_headers"] = {
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
    
    @asynccontextmanager
    async def get_context(self, context_id: str = "default"):
        """Get or create a browser context"""
        async with self.semaphore:
            try:
                if context_id not in self.contexts:
                    if not self.browser:
                        await self._launch_browser()
                    
                    # Create new context with stealth options
                    context = await self.browser.new_context(**self.context_options)
                    
                    # Add stealth scripts to context
                    await context.add_init_script("""
                        Object.defineProperty(navigator, 'webdriver', {
                            get: () => undefined
                        });
                    """)
                    
                    self.contexts[context_id] = context
                    logger.debug("browser_context_created", context_id=context_id)
                
                yield self.contexts[context_id]
            except Exception as e:
                logger.error("browser_context_error", 
                           context_id=context_id,
                           error=str(e))
                raise
    
    @asynccontextmanager
    async def get_page(self, context_id: str = "default"):
        """Get a new page from a context"""
        async with self.get_context(context_id) as context:
            page = await context.new_page()
            
            # Set default timeouts
            page.set_default_timeout(config.scrape_timeout)
            page.set_default_navigation_timeout(config.navigation_timeout)
            
            # Add request interception for additional stealth
            await self._setup_page_stealth(page)
            
            try:
                yield page
            finally:
                await page.close()
    
    async def _setup_page_stealth(self, page: Page):
        """Setup additional stealth measures for a page"""
        # Intercept and modify requests if needed
        async def handle_route(route):
            headers = route.request.headers
            # Remove automation-related headers
            headers.pop("sec-ch-ua-platform", None)
            await route.continue_(headers=headers)
        
        # Only intercept if we need to modify headers
        if config.is_production:
            await page.route("**/*", handle_route)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def navigate_with_retry(self, page: Page, url: str) -> bool:
        """Navigate to URL with retry logic"""
        try:
            response = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=config.navigation_timeout
            )
            
            if response and response.status >= 400:
                logger.warning("navigation_failed_http_error",
                             url=url,
                             status=response.status)
                return False
            
            # Wait for potential redirects or dynamic content
            await page.wait_for_timeout(2000)
            
            logger.info("navigation_successful", url=url)
            return True
        except Exception as e:
            logger.error("navigation_failed", url=url, error=str(e))
            raise
    
    async def cleanup_context(self, context_id: str):
        """Clean up a specific context"""
        if context_id in self.contexts:
            try:
                await self.contexts[context_id].close()
                del self.contexts[context_id]
                logger.debug("browser_context_cleaned", context_id=context_id)
            except Exception as e:
                logger.error("context_cleanup_failed",
                           context_id=context_id,
                           error=str(e))
    
    async def cleanup(self):
        """Clean up all browser resources"""
        try:
            # Close all contexts
            for context_id in list(self.contexts.keys()):
                await self.cleanup_context(context_id)
            
            # Close browser
            if self.browser:
                await self.browser.close()
                self.browser = None
            
            # Stop playwright
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
            
            logger.info("browser_manager_cleaned_up")
        except Exception as e:
            logger.error("browser_cleanup_failed", error=str(e))
    
    async def health_check(self) -> bool:
        """Check if browser is healthy"""
        try:
            if not self.browser or not self.browser.is_connected():
                return False
            
            # Try to create a simple page as health check
            async with self.get_page("health_check") as page:
                await page.goto("about:blank")
                return True
        except Exception as e:
            logger.error("browser_health_check_failed", error=str(e))
            return False


# Global browser manager instance
browser_manager = BrowserManager()