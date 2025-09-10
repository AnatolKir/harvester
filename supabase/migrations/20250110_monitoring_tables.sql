-- Create monitoring_metrics table for tracking performance metrics
CREATE TABLE IF NOT EXISTS monitoring_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for querying by name and time
    INDEX idx_monitoring_metrics_name_time (metric_name, recorded_at DESC)
);

-- Create system_alerts table for alert audit trail
CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGSERIAL PRIMARY KEY,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    
    -- Index for querying recent alerts
    INDEX idx_system_alerts_sent_at (sent_at DESC),
    INDEX idx_system_alerts_severity (severity, sent_at DESC)
);

-- Create health_check_history table
CREATE TABLE IF NOT EXISTS health_check_history (
    id BIGSERIAL PRIMARY KEY,
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    components JSONB NOT NULL,
    metrics JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for querying recent checks
    INDEX idx_health_check_history_checked_at (checked_at DESC)
);

-- Create monitoring views for dashboard

-- View for recent alerts (last 24 hours)
CREATE OR REPLACE VIEW v_recent_alerts AS
SELECT 
    severity,
    title,
    message,
    details,
    sent_at,
    acknowledged
FROM system_alerts
WHERE sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;

-- View for current system health
CREATE OR REPLACE VIEW v_current_health AS
SELECT 
    overall_status,
    components,
    metrics,
    checked_at
FROM health_check_history
ORDER BY checked_at DESC
LIMIT 1;

-- View for hourly domain extraction rate
CREATE OR REPLACE VIEW v_hourly_domain_rate AS
SELECT 
    DATE_TRUNC('hour', first_seen_at) as hour,
    COUNT(*) as domains_discovered
FROM domain
WHERE first_seen_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', first_seen_at)
ORDER BY hour DESC;

-- View for job execution stats (last 24 hours)
CREATE OR REPLACE VIEW v_job_execution_stats AS
SELECT 
    job_type,
    status,
    COUNT(*) as count,
    AVG(CASE 
        WHEN completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_at - executed_at))
        ELSE NULL 
    END) as avg_duration_seconds
FROM job_execution
WHERE executed_at > NOW() - INTERVAL '24 hours'
GROUP BY job_type, status
ORDER BY job_type, status;

-- View for monitoring dashboard summary
CREATE OR REPLACE VIEW v_monitoring_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM domain WHERE first_seen_at > NOW() - INTERVAL '24 hours') as domains_24h,
    (SELECT COUNT(*) FROM video WHERE discovered_at > NOW() - INTERVAL '24 hours') as videos_24h,
    (SELECT COUNT(*) FROM comment WHERE fetched_at > NOW() - INTERVAL '24 hours') as comments_24h,
    (SELECT COUNT(*) FROM system_alerts WHERE sent_at > NOW() - INTERVAL '24 hours' AND acknowledged = FALSE) as unacknowledged_alerts,
    (SELECT overall_status FROM health_check_history ORDER BY checked_at DESC LIMIT 1) as current_health_status,
    (SELECT checked_at FROM health_check_history ORDER BY checked_at DESC LIMIT 1) as last_health_check,
    (SELECT executed_at FROM job_execution ORDER BY executed_at DESC LIMIT 1) as last_job_execution,
    (SELECT COUNT(*) FROM job_execution WHERE status = 'running') as active_jobs;

-- Function to record metric
CREATE OR REPLACE FUNCTION record_metric(
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(10,2),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_tags JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit, tags)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_tags);
END;
$$ LANGUAGE plpgsql;

-- Function to get metric average over time period
CREATE OR REPLACE FUNCTION get_metric_average(
    p_metric_name VARCHAR(100),
    p_hours INTEGER DEFAULT 24
) RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        SELECT AVG(metric_value)
        FROM monitoring_metrics
        WHERE metric_name = p_metric_name
        AND recorded_at > NOW() - INTERVAL '1 hour' * p_hours
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON v_recent_alerts TO anon, authenticated;
GRANT SELECT ON v_current_health TO anon, authenticated;
GRANT SELECT ON v_hourly_domain_rate TO anon, authenticated;
GRANT SELECT ON v_job_execution_stats TO anon, authenticated;
GRANT SELECT ON v_monitoring_dashboard TO anon, authenticated;

-- RLS policies
ALTER TABLE monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to monitoring_metrics" ON monitoring_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to system_alerts" ON system_alerts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to health_check_history" ON health_check_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to read monitoring data
CREATE POLICY "Authenticated users can read monitoring_metrics" ON monitoring_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read system_alerts" ON system_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read health_check_history" ON health_check_history
    FOR SELECT USING (auth.role() = 'authenticated');