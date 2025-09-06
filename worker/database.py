"""
Supabase database client initialization and management
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import structlog
from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential

from config import config

logger = structlog.get_logger()


class SupabaseClient:
    """Supabase database client wrapper"""
    
    def __init__(self):
        """Initialize Supabase client"""
        self._client: Optional[Client] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Supabase client with service role key"""
        try:
            self._client = create_client(
                supabase_url=config.supabase_url,
                supabase_key=config.supabase_service_key
            )
            logger.info("supabase_client_initialized", 
                       url=config.supabase_url[:30] + "...")
        except Exception as e:
            logger.error("supabase_client_initialization_failed", error=str(e))
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance"""
        if not self._client:
            self._initialize_client()
        return self._client
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def insert_video(self, video_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new video record"""
        try:
            result = self.client.table("video").insert(video_data).execute()
            logger.info("video_inserted", video_id=video_data.get("video_id"))
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("video_insert_failed", 
                        video_id=video_data.get("video_id"),
                        error=str(e))
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def insert_comments(self, comments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Bulk insert comments"""
        if not comments:
            return []
        
        try:
            result = self.client.table("comment").insert(comments).execute()
            logger.info("comments_inserted", count=len(comments))
            return result.data
        except Exception as e:
            logger.error("comments_insert_failed", 
                        count=len(comments),
                        error=str(e))
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def upsert_domain(self, domain: str) -> Dict[str, Any]:
        """Upsert a domain record"""
        domain_data = {
            "domain": domain.lower(),
            "first_seen_at": datetime.now(timezone.utc).isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "mention_count": 1
        }
        
        try:
            result = self.client.table("domain").upsert(
                domain_data,
                on_conflict="domain"
            ).execute()
            logger.debug("domain_upserted", domain=domain)
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("domain_upsert_failed", 
                        domain=domain,
                        error=str(e))
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def insert_domain_mention(self, mention_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a domain mention record"""
        try:
            result = self.client.table("domain_mention").insert(mention_data).execute()
            logger.debug("domain_mention_inserted", 
                        domain_id=mention_data.get("domain_id"))
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("domain_mention_insert_failed", 
                        domain_id=mention_data.get("domain_id"),
                        error=str(e))
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def get_videos_for_crawling(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get videos that need comment crawling"""
        try:
            # Get videos that haven't been crawled or were crawled > 24 hours ago
            result = self.client.table("video").select("*").or_(
                "last_crawled_at.is.null",
                f"last_crawled_at.lt.{datetime.now(timezone.utc).isoformat()}"
            ).eq("is_active", True).limit(limit).execute()
            
            logger.info("videos_fetched_for_crawling", count=len(result.data))
            return result.data
        except Exception as e:
            logger.error("get_videos_for_crawling_failed", error=str(e))
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def update_video_crawl_status(self, video_id: str, status: Dict[str, Any]) -> Dict[str, Any]:
        """Update video crawl status"""
        try:
            update_data = {
                "last_crawled_at": datetime.now(timezone.utc).isoformat(),
                **status
            }
            
            result = self.client.table("video").update(update_data).eq(
                "id", video_id
            ).execute()
            
            logger.info("video_crawl_status_updated", 
                       video_id=video_id,
                       status=status)
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("update_video_crawl_status_failed", 
                        video_id=video_id,
                        error=str(e))
            raise
    
    async def health_check(self) -> bool:
        """Check if database connection is healthy"""
        try:
            # Simple query to check connection
            result = self.client.table("video").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error("database_health_check_failed", error=str(e))
            return False


# Global database client instance
db_client = SupabaseClient()