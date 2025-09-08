-- Migration: Essential Indexes & Constraints (Sprint 3 - Prompt 24)
-- This migration is additive and idempotent where possible.

-- Video indexes (defensive, may already exist)
CREATE INDEX IF NOT EXISTS idx_video_video_id ON video(video_id);
CREATE INDEX IF NOT EXISTS idx_video_last_crawled_at ON video(last_crawled_at);

-- Comment indexes (defensive)
CREATE INDEX IF NOT EXISTS idx_comment_video_id ON comment(video_id);

-- Domain time index (defensive)
CREATE INDEX IF NOT EXISTS idx_domain_last_seen_at ON domain(last_seen_at DESC);

-- Enforce uniqueness for domain mentions across (domain, video, comment)
-- Use a unique index for idempotency (constraint-compatible)
CREATE UNIQUE INDEX IF NOT EXISTS ux_domain_mention_triplet
  ON domain_mention(domain_id, video_id, comment_id);

-- Optional: composite for discovery queries by domain + time
CREATE INDEX IF NOT EXISTS idx_domain_mention_domain_time
  ON domain_mention(domain_id, discovered_at DESC);

-- Notes:
-- - We rely on existing FKs in initial schema; this adds missing uniqueness and ensures index coverage.
-- - IF NOT EXISTS guards make this safe for both fresh and existing databases.


