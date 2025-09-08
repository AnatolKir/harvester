-- Migration: UI-Focused SQL Views (Sprint 3 - Prompt 25)

-- v_domains_overview(domain, total_mentions, first_seen, last_seen)
CREATE OR REPLACE VIEW v_domains_overview AS
SELECT 
  d.domain_name AS domain,
  d.mention_count AS total_mentions,
  d.first_seen_at AS first_seen,
  d.last_seen_at AS last_seen
FROM domain d;

-- v_domains_new_today(domain, mentions_today)
-- Note: replaces any prior definition with a simplified schema
CREATE OR REPLACE VIEW v_domains_new_today AS
SELECT 
  d.domain_name AS domain,
  COUNT(dm.id) AS mentions_today
FROM domain d
JOIN domain_mention dm ON dm.domain_id = d.id
WHERE dm.discovered_at >= CURRENT_DATE
GROUP BY d.domain_name;

-- v_domain_mentions_recent(domain, comment_id, video_id, created_at)
CREATE OR REPLACE VIEW v_domain_mentions_recent AS
SELECT 
  d.domain_name AS domain,
  dm.comment_id,
  dm.video_id,
  dm.created_at
FROM domain_mention dm
JOIN domain d ON d.id = dm.domain_id;

-- v_pipeline_stats(domains_day, comments_day, errors_day)
CREATE OR REPLACE VIEW v_pipeline_stats AS
SELECT
  (SELECT COUNT(*) FROM domain WHERE first_seen_at >= CURRENT_DATE) AS domains_day,
  (SELECT COUNT(*) FROM comment WHERE discovered_at >= CURRENT_DATE) AS comments_day,
  (SELECT COUNT(*) FROM system_logs WHERE level = 'error' AND created_at >= CURRENT_DATE) AS errors_day;


