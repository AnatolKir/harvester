-- Fix Schema Mismatches Migration
-- This migration fixes inconsistencies between database schema and application code

-- 1. First, update the domain table to use 'domain' instead of 'domain_name'
ALTER TABLE domain RENAME COLUMN domain_name TO domain;

-- 2. Update the domain_mention table to properly reference domain_id
-- The current schema shows domain_mention already has domain_id, but API is looking for 'domain' string
-- Add a domain column that stores the domain name for easier querying
ALTER TABLE domain_mention ADD COLUMN IF NOT EXISTS domain TEXT;

-- Populate the domain column with the actual domain name
UPDATE domain_mention dm
SET domain = d.domain
FROM domain d
WHERE dm.domain_id = d.id;

-- 3. Recreate the views with consistent column naming
DROP VIEW IF EXISTS v_domains_overview CASCADE;
CREATE VIEW v_domains_overview AS
SELECT 
  d.id,
  d.domain,
  d.mention_count AS total_mentions,
  d.first_seen_at AS first_seen,
  d.last_seen_at AS last_seen,
  d.is_suspicious,
  d.is_verified,
  d.metadata
FROM domain d
WHERE d.domain IS NOT NULL;

-- Fix v_domains_new_today to include id
DROP VIEW IF EXISTS v_domains_new_today CASCADE;
CREATE VIEW v_domains_new_today AS
SELECT 
  d.id,
  d.domain,
  COUNT(dm.id) AS mentions_today,
  d.first_seen_at AS first_seen
FROM domain d
LEFT JOIN domain_mention dm ON dm.domain_id = d.id AND dm.discovered_at >= CURRENT_DATE
GROUP BY d.id, d.domain, d.first_seen_at;

-- Fix v_domain_mentions_recent
DROP VIEW IF EXISTS v_domain_mentions_recent CASCADE;
CREATE VIEW v_domain_mentions_recent AS
SELECT 
  dm.id,
  d.domain,
  dm.domain_id,
  dm.comment_id,
  dm.video_id,
  dm.created_at,
  dm.discovered_at,
  dm.mention_text,
  dm.context
FROM domain_mention dm
JOIN domain d ON d.id = dm.domain_id
ORDER BY dm.discovered_at DESC;

-- 4. Create missing RPC function for time series data
CREATE OR REPLACE FUNCTION get_domain_time_series(
  p_domain_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(date TEXT, mention_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(dm.discovered_at)::TEXT AS date,
    COUNT(*)::BIGINT AS mention_count
  FROM domain_mention dm
  WHERE dm.domain_id = p_domain_id
    AND dm.discovered_at >= p_start_date
    AND dm.discovered_at <= p_end_date
  GROUP BY DATE(dm.discovered_at)
  ORDER BY DATE(dm.discovered_at);
END;
$$;

-- 5. Add indexes for the new domain column on domain_mention
CREATE INDEX IF NOT EXISTS idx_domain_mention_domain ON domain_mention(domain);

-- 6. Update the unique constraint on domain table
ALTER TABLE domain DROP CONSTRAINT IF EXISTS domain_domain_name_key;
ALTER TABLE domain ADD CONSTRAINT domain_domain_key UNIQUE (domain);