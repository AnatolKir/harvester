-- TikTok Domain Harvester - Views and Functions Migration
-- This migration creates SQL views and utility functions for the UI

-- =============================================================================
-- UTILITY VIEWS
-- =============================================================================

-- View: Domains discovered today
CREATE VIEW v_domains_new_today AS
SELECT 
    d.id,
    d.domain_name,
    d.tld,
    d.subdomain,
    d.mention_count,
    d.first_seen_at,
    d.last_seen_at,
    d.is_suspicious,
    d.is_verified,
    d.notes,
    COUNT(DISTINCT dm.video_id) as video_count,
    COUNT(DISTINCT dm.comment_id) as comment_count,
    ARRAY_AGG(DISTINCT v.username ORDER BY v.username) as video_usernames,
    MIN(dm.discovered_at) as first_mention_today,
    MAX(dm.discovered_at) as latest_mention_today
FROM domain d
JOIN domain_mention dm ON d.id = dm.domain_id
JOIN video v ON dm.video_id = v.id
WHERE d.first_seen_at >= CURRENT_DATE
GROUP BY d.id, d.domain_name, d.tld, d.subdomain, d.mention_count, 
         d.first_seen_at, d.last_seen_at, d.is_suspicious, d.is_verified, d.notes
ORDER BY d.first_seen_at DESC, d.mention_count DESC;

-- View: Top domains by mention count
CREATE VIEW v_domains_top_mentioned AS
SELECT 
    d.id,
    d.domain_name,
    d.tld,
    d.subdomain,
    d.mention_count,
    d.first_seen_at,
    d.last_seen_at,
    d.is_suspicious,
    d.is_verified,
    COUNT(DISTINCT dm.video_id) as video_count,
    COUNT(DISTINCT dm.comment_id) as comment_count,
    COUNT(DISTINCT c.username) as unique_commenters,
    EXTRACT(DAYS FROM (NOW() - d.first_seen_at)) as days_since_first_seen
FROM domain d
JOIN domain_mention dm ON d.id = dm.domain_id
JOIN comment c ON dm.comment_id = c.id
GROUP BY d.id, d.domain_name, d.tld, d.subdomain, d.mention_count,
         d.first_seen_at, d.last_seen_at, d.is_suspicious, d.is_verified
ORDER BY d.mention_count DESC, d.last_seen_at DESC;

-- View: Recent domain activity (last 7 days)
CREATE VIEW v_domains_recent_activity AS
SELECT 
    d.id,
    d.domain_name,
    d.tld,
    d.subdomain,
    d.mention_count,
    d.first_seen_at,
    d.last_seen_at,
    d.is_suspicious,
    d.is_verified,
    COUNT(dm.id) as recent_mentions,
    COUNT(DISTINCT dm.video_id) as recent_videos,
    COUNT(DISTINCT dm.comment_id) as recent_comments,
    MIN(dm.discovered_at) as first_recent_mention,
    MAX(dm.discovered_at) as latest_recent_mention
FROM domain d
JOIN domain_mention dm ON d.id = dm.domain_id
WHERE dm.discovered_at >= (NOW() - INTERVAL '7 days')
GROUP BY d.id, d.domain_name, d.tld, d.subdomain, d.mention_count,
         d.first_seen_at, d.last_seen_at, d.is_suspicious, d.is_verified
ORDER BY recent_mentions DESC, latest_recent_mention DESC;

-- View: Video summary with domain counts
CREATE VIEW v_videos_with_domains AS
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

-- View: Comment analysis with domain mentions
CREATE VIEW v_comments_with_domains AS
SELECT 
    c.id,
    c.video_id,
    c.username,
    c.text,
    c.like_count,
    c.posted_at,
    c.discovered_at,
    v.username as video_username,
    v.video_id as video_tiktok_id,
    COUNT(dm.id) as domain_mentions_count,
    ARRAY_AGG(DISTINCT d.domain_name ORDER BY d.domain_name) FILTER (WHERE d.domain_name IS NOT NULL) as mentioned_domains,
    ARRAY_AGG(DISTINCT dm.mention_text ORDER BY dm.mention_text) FILTER (WHERE dm.mention_text IS NOT NULL) as mention_texts
FROM comment c
JOIN video v ON c.video_id = v.id
LEFT JOIN domain_mention dm ON c.id = dm.comment_id
LEFT JOIN domain d ON dm.domain_id = d.id
GROUP BY c.id, c.video_id, c.username, c.text, c.like_count,
         c.posted_at, c.discovered_at, v.username, v.video_id
ORDER BY c.discovered_at DESC;

-- =============================================================================
-- DASHBOARD SUMMARY FUNCTIONS
-- =============================================================================

-- Function: Get dashboard stats for date range
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    end_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS TABLE (
    total_domains BIGINT,
    new_domains BIGINT,
    total_videos BIGINT,
    new_videos BIGINT,
    total_comments BIGINT,
    new_comments BIGINT,
    total_mentions BIGINT,
    new_mentions BIGINT,
    avg_domains_per_video NUMERIC,
    avg_mentions_per_domain NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(DISTINCT d.id) as total_domains,
            COUNT(DISTINCT d.id) FILTER (WHERE d.first_seen_at >= start_date AND d.first_seen_at < end_date) as new_domains,
            COUNT(DISTINCT v.id) as total_videos,
            COUNT(DISTINCT v.id) FILTER (WHERE v.discovered_at >= start_date AND v.discovered_at < end_date) as new_videos,
            COUNT(DISTINCT c.id) as total_comments,
            COUNT(DISTINCT c.id) FILTER (WHERE c.discovered_at >= start_date AND c.discovered_at < end_date) as new_comments,
            COUNT(dm.id) as total_mentions,
            COUNT(dm.id) FILTER (WHERE dm.discovered_at >= start_date AND dm.discovered_at < end_date) as new_mentions
        FROM domain d
        FULL OUTER JOIN domain_mention dm ON d.id = dm.domain_id
        FULL OUTER JOIN comment c ON dm.comment_id = c.id
        FULL OUTER JOIN video v ON c.video_id = v.id
    )
    SELECT 
        s.total_domains,
        s.new_domains,
        s.total_videos,
        s.new_videos,
        s.total_comments,
        s.new_comments,
        s.total_mentions,
        s.new_mentions,
        CASE WHEN s.total_videos > 0 THEN ROUND(s.total_domains::NUMERIC / s.total_videos::NUMERIC, 2) ELSE 0 END,
        CASE WHEN s.total_domains > 0 THEN ROUND(s.total_mentions::NUMERIC / s.total_domains::NUMERIC, 2) ELSE 0 END
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- Function: Get trending domains (domains with increasing mention velocity)
CREATE OR REPLACE FUNCTION get_trending_domains(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    domain_id UUID,
    domain_name TEXT,
    current_mentions BIGINT,
    previous_mentions BIGINT,
    growth_rate NUMERIC,
    velocity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            d.id,
            d.domain_name,
            COUNT(dm.id) as mentions
        FROM domain d
        JOIN domain_mention dm ON d.id = dm.domain_id
        WHERE dm.discovered_at >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
        GROUP BY d.id, d.domain_name
    ),
    previous_period AS (
        SELECT 
            d.id,
            d.domain_name,
            COUNT(dm.id) as mentions
        FROM domain d
        JOIN domain_mention dm ON d.id = dm.domain_id
        WHERE dm.discovered_at >= (CURRENT_DATE - INTERVAL '1 day' * days_back * 2)
          AND dm.discovered_at < (CURRENT_DATE - INTERVAL '1 day' * days_back)
        GROUP BY d.id, d.domain_name
    )
    SELECT 
        c.id,
        c.domain_name,
        c.mentions,
        COALESCE(p.mentions, 0),
        CASE 
            WHEN COALESCE(p.mentions, 0) > 0 
            THEN ROUND(((c.mentions - COALESCE(p.mentions, 0))::NUMERIC / COALESCE(p.mentions, 1)::NUMERIC) * 100, 2)
            ELSE 100.0
        END as growth_rate,
        CASE 
            WHEN COALESCE(p.mentions, 0) > 0
            THEN ROUND(c.mentions::NUMERIC / COALESCE(p.mentions, 1)::NUMERIC, 2)
            ELSE c.mentions::NUMERIC
        END as velocity_score
    FROM current_period c
    LEFT JOIN previous_period p ON c.id = p.id
    WHERE c.mentions > 0
    ORDER BY velocity_score DESC, c.mentions DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function: Clean up old data (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    deleted_comments BIGINT,
    deleted_mentions BIGINT,
    deleted_videos BIGINT
) AS $$
DECLARE
    comment_count BIGINT;
    mention_count BIGINT; 
    video_count BIGINT;
BEGIN
    -- Delete old domain mentions first (due to FK constraints)
    DELETE FROM domain_mention 
    WHERE discovered_at < (NOW() - INTERVAL '1 day' * days_to_keep);
    GET DIAGNOSTICS mention_count = ROW_COUNT;
    
    -- Delete old comments
    DELETE FROM comment 
    WHERE discovered_at < (NOW() - INTERVAL '1 day' * days_to_keep);
    GET DIAGNOSTICS comment_count = ROW_COUNT;
    
    -- Delete old videos (this will cascade to remaining comments/mentions)
    DELETE FROM video 
    WHERE discovered_at < (NOW() - INTERVAL '1 day' * days_to_keep);
    GET DIAGNOSTICS video_count = ROW_COUNT;
    
    -- Clean up domains with no mentions (orphaned domains)
    DELETE FROM domain 
    WHERE id NOT IN (SELECT DISTINCT domain_id FROM domain_mention);
    
    RETURN QUERY SELECT comment_count, mention_count, video_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Refresh materialized views (if we add any later)
CREATE OR REPLACE FUNCTION refresh_dashboard_cache()
RETURNS VOID AS $$
BEGIN
    -- Placeholder for future materialized view refreshes
    -- For now, just analyze tables to update statistics
    ANALYZE video;
    ANALYZE comment; 
    ANALYZE domain;
    ANALYZE domain_mention;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES FOR VIEWS
-- =============================================================================

-- Note: Date-based function indexes removed due to Supabase IMMUTABLE requirement
-- The existing timestamp indexes on first_seen_at and discovered_at will be used instead

-- Partial indexes for active/verified data
CREATE INDEX IF NOT EXISTS idx_domain_verified ON domain(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_domain_suspicious ON domain(is_suspicious) WHERE is_suspicious = true;