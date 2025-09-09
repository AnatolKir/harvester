-- Materialized Views for performance (Prompt 48)

-- Domains overview materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_domains_overview AS
SELECT 
  d.domain_name AS domain,
  d.mention_count AS total_mentions,
  d.first_seen_at AS first_seen,
  d.last_seen_at AS last_seen
FROM domain d;

-- Indexes for mv_domains_overview
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ix_mv_domains_overview_domain'
  ) THEN
    CREATE INDEX ix_mv_domains_overview_domain ON mv_domains_overview (domain);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ix_mv_domains_overview_last_seen'
  ) THEN
    CREATE INDEX ix_mv_domains_overview_last_seen ON mv_domains_overview (last_seen DESC);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ix_mv_domains_overview_total_mentions'
  ) THEN
    CREATE INDEX ix_mv_domains_overview_total_mentions ON mv_domains_overview (total_mentions DESC);
  END IF;
END$$;

-- Videos with domains materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_videos_with_domains AS
SELECT 
    v.id,
    v.video_id,
    v.username,
    v.caption,
    v.video_url,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.posted_at,
    v.discovered_at,
    v.last_crawled_at,
    COUNT(DISTINCT dm.domain_id) as unique_domains_mentioned,
    COUNT(dm.id) as total_domain_mentions,
    COUNT(DISTINCT c.id) as total_comments,
    ARRAY_AGG(DISTINCT d.domain_name ORDER BY d.domain_name) FILTER (WHERE d.domain_name IS NOT NULL) as mentioned_domains
FROM video v
LEFT JOIN comment c ON v.id = c.video_id
LEFT JOIN domain_mention dm ON v.id = dm.video_id
LEFT JOIN domain d ON dm.domain_id = d.id
GROUP BY v.id, v.video_id, v.username, v.caption, v.video_url,
         v.view_count, v.like_count, v.comment_count, v.posted_at,
         v.discovered_at, v.last_crawled_at
ORDER BY v.discovered_at DESC;

-- Indexes for mv_videos_with_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ix_mv_videos_with_domains_discovered_at'
  ) THEN
    CREATE INDEX ix_mv_videos_with_domains_discovered_at ON mv_videos_with_domains (discovered_at DESC);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'ix_mv_videos_with_domains_video_id'
  ) THEN
    CREATE INDEX ix_mv_videos_with_domains_video_id ON mv_videos_with_domains (video_id);
  END IF;
END$$;

-- Helper function to refresh all matviews concurrently
CREATE OR REPLACE FUNCTION refresh_matviews()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    PERFORM 1;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_domains_overview;
  EXCEPTION WHEN undefined_table THEN
    -- Matview may not exist yet; ignore
    NULL;
  END;
  BEGIN
    PERFORM 1;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_videos_with_domains;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END;
$$;


