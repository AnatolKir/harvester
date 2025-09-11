-- Discovery throughput and activity metrics

-- Sum of videosFound from discovery completion logs by hour (last 24h)
CREATE OR REPLACE VIEW v_discovery_videos_per_hour AS
SELECT
  date_trunc('hour', created_at) AS hour,
  SUM( (metadata->>'videosFound')::int ) AS videos_found
FROM system_logs
WHERE message = 'Video discovery completed step'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;

-- Total videos in the last hour
CREATE OR REPLACE VIEW v_discovery_last_hour AS
SELECT COALESCE(SUM((metadata->>'videosFound')::int), 0) AS videos_last_hour
FROM system_logs
WHERE message = 'Video discovery completed step'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Active enrichment jobs running now (requires job_status updates from enrichment)
CREATE OR REPLACE VIEW v_active_enrichment_jobs AS
SELECT COUNT(*) AS active_enrichment
FROM job_status
WHERE job_type = 'enrichment_links' AND status = 'running';


