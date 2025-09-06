-- Migration: System Tables for Inngest Integration
-- This migration adds tables for job tracking, system configuration, and logging

-- =============================================================================
-- SYSTEM CONFIGURATION TABLE
-- =============================================================================

-- System configuration table for kill switch and other settings
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial kill switch configuration
INSERT INTO system_config (key, value, description) VALUES
('kill_switch_active', 'false', 'Emergency kill switch for all jobs'),
('max_concurrent_discovery_jobs', '5', 'Maximum concurrent discovery jobs'),
('max_concurrent_harvesting_jobs', '10', 'Maximum concurrent harvesting jobs'),
('discovery_job_timeout_minutes', '30', 'Timeout for discovery jobs in minutes'),
('harvesting_job_timeout_minutes', '60', 'Timeout for harvesting jobs in minutes');

-- =============================================================================
-- JOB STATUS TRACKING TABLE
-- =============================================================================

-- Job status tracking table
CREATE TABLE job_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL, -- 'discovery', 'harvesting', 'system', etc.
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER, -- Execution time in milliseconds
    attempt_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM LOGS TABLE
-- =============================================================================

-- System logs table for tracking events, errors, and system health
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'job_start', 'job_complete', 'job_error', 'kill_switch', 'health_check', etc.
    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    job_id TEXT, -- Reference to job_status.job_id if related to a job
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DEAD LETTER QUEUE TABLE
-- =============================================================================

-- Dead letter queue for failed jobs that need manual intervention
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_event_name TEXT NOT NULL,
    original_payload JSONB NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retry_scheduled', 'processed', 'abandoned')),
    retry_after TIMESTAMPTZ, -- When to retry this job
    processed_at TIMESTAMPTZ, -- When this was processed/resolved
    notes TEXT, -- Manual notes from operators
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- System config indexes
CREATE INDEX idx_system_config_key ON system_config(key);

-- Job status indexes
CREATE INDEX idx_job_status_job_id ON job_status(job_id);
CREATE INDEX idx_job_status_type_status ON job_status(job_type, status);
CREATE INDEX idx_job_status_started_at ON job_status(started_at DESC);
CREATE INDEX idx_job_status_created_at ON job_status(created_at DESC);

-- System logs indexes  
CREATE INDEX idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_job_id ON system_logs(job_id) WHERE job_id IS NOT NULL;

-- Dead letter queue indexes
CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_retry_after ON dead_letter_queue(retry_after) WHERE retry_after IS NOT NULL;
CREATE INDEX idx_dlq_created_at ON dead_letter_queue(created_at DESC);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Create triggers for updated_at columns
CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_status_updated_at 
    BEFORE UPDATE ON job_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dead_letter_queue_updated_at 
    BEFORE UPDATE ON dead_letter_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- System config policies (read for authenticated, write for service role)
CREATE POLICY "Allow authenticated users to read system config" ON system_config
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage system config" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

-- Job status policies
CREATE POLICY "Allow authenticated users to read job status" ON job_status
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage job status" ON job_status
    FOR ALL USING (auth.role() = 'service_role');

-- System logs policies
CREATE POLICY "Allow authenticated users to read system logs" ON system_logs
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage system logs" ON system_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Dead letter queue policies
CREATE POLICY "Allow authenticated users to read dead letter queue" ON dead_letter_queue
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage dead letter queue" ON dead_letter_queue
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- UTILITY FUNCTIONS FOR SYSTEM MONITORING
-- =============================================================================

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE (
    kill_switch_active BOOLEAN,
    total_jobs_24h BIGINT,
    completed_jobs_24h BIGINT,
    failed_jobs_24h BIGINT,
    running_jobs BIGINT,
    pending_dlq_items BIGINT,
    last_discovery_job TIMESTAMPTZ,
    last_harvesting_job TIMESTAMPTZ,
    system_load_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH job_stats AS (
        SELECT 
            COUNT(*) as total_jobs,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
            COUNT(*) FILTER (WHERE status = 'running') as running_jobs
        FROM job_status 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
    ),
    dlq_stats AS (
        SELECT COUNT(*) as pending_items
        FROM dead_letter_queue
        WHERE status = 'pending'
    ),
    last_jobs AS (
        SELECT 
            MAX(created_at) FILTER (WHERE job_type = 'discovery') as last_discovery,
            MAX(created_at) FILTER (WHERE job_type = 'harvesting') as last_harvesting
        FROM job_status
        WHERE status = 'completed'
    ),
    kill_switch AS (
        SELECT (value::boolean) as active
        FROM system_config
        WHERE key = 'kill_switch_active'
    )
    SELECT 
        ks.active,
        js.total_jobs,
        js.completed_jobs,
        js.failed_jobs,
        js.running_jobs,
        dlq.pending_items,
        lj.last_discovery,
        lj.last_harvesting,
        CASE 
            WHEN js.total_jobs = 0 THEN 0
            ELSE ROUND((js.completed_jobs::numeric / js.total_jobs::numeric) * 100, 2)
        END as system_load_score
    FROM job_stats js
    CROSS JOIN dlq_stats dlq
    CROSS JOIN last_jobs lj  
    CROSS JOIN kill_switch ks;
END;
$$ LANGUAGE plpgsql;

-- Function to get job execution metrics
CREATE OR REPLACE FUNCTION get_job_metrics(job_type_filter TEXT DEFAULT NULL, hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    job_type TEXT,
    total_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    avg_execution_time_ms NUMERIC,
    success_rate NUMERIC,
    last_job_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        js.job_type,
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE js.status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE js.status = 'failed') as failed_jobs,
        ROUND(AVG(js.execution_time_ms) FILTER (WHERE js.execution_time_ms IS NOT NULL), 2) as avg_execution_time_ms,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE js.status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        END as success_rate,
        MAX(js.created_at) as last_job_at
    FROM job_status js
    WHERE js.created_at >= NOW() - INTERVAL '1 hour' * hours_back
      AND (job_type_filter IS NULL OR js.job_type = job_type_filter)
    GROUP BY js.job_type
    ORDER BY total_jobs DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS FOR MONITORING DASHBOARD
-- =============================================================================

-- View: Active jobs summary
CREATE VIEW v_active_jobs AS
SELECT 
    job_type,
    status,
    COUNT(*) as job_count,
    MIN(started_at) as oldest_job_started,
    MAX(started_at) as newest_job_started,
    AVG(EXTRACT(EPOCH FROM (NOW() - started_at))) as avg_runtime_seconds
FROM job_status
WHERE status IN ('running', 'pending')
GROUP BY job_type, status
ORDER BY job_type, status;

-- View: Recent system events
CREATE VIEW v_recent_system_events AS
SELECT 
    sl.event_type,
    sl.level,
    sl.message,
    sl.created_at,
    js.job_type,
    js.status as job_status
FROM system_logs sl
LEFT JOIN job_status js ON sl.job_id = js.job_id
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY sl.created_at DESC
LIMIT 100;

-- View: Dead letter queue summary
CREATE VIEW v_dlq_summary AS
SELECT 
    original_event_name,
    status,
    COUNT(*) as item_count,
    MIN(created_at) as oldest_item,
    MAX(created_at) as newest_item,
    COUNT(*) FILTER (WHERE retry_after <= NOW()) as ready_for_retry
FROM dead_letter_queue
GROUP BY original_event_name, status
ORDER BY item_count DESC;