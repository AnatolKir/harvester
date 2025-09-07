-- Schema Reconcile Migration
-- Goal: Align canonical names across schema, types, and API.
-- Canonical:
--   video.video_id (TikTok id string)
--   domain.domain
--   domain_mention(domain text, video_id text, comment_id text, created_at timestamptz default now())
--   Views: v_domains_new_today, v_domains_heating, v_domains_trending

-- Safety: Use conditional renames/additions; no destructive drops.

-- =============================
-- Table: video
-- =============================
DO $$
BEGIN
  -- Rename tiktok_id -> video_id if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video' AND column_name = 'tiktok_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video' AND column_name = 'video_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.video RENAME COLUMN tiktok_id TO video_id';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipped rename on video: %', SQLERRM;
END$$;

-- =============================
-- Table: comment
-- =============================
DO $$
BEGIN
  -- Rename tiktok_comment_id -> comment_id if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comment' AND column_name = 'tiktok_comment_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comment' AND column_name = 'comment_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.comment RENAME COLUMN tiktok_comment_id TO comment_id';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipped rename on comment: %', SQLERRM;
END$$;

-- =============================
-- Table: domain
-- =============================
DO $$
BEGIN
  -- Ensure canonical column names
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'first_seen_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'first_seen'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain RENAME COLUMN first_seen_at TO first_seen';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'last_seen_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'last_seen'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain RENAME COLUMN last_seen_at TO last_seen';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'mention_count'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'total_mentions'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain RENAME COLUMN mention_count TO total_mentions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'unique_video_count'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain' AND column_name = 'unique_videos'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain RENAME COLUMN unique_video_count TO unique_videos';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipped rename on domain: %', SQLERRM;
END$$;

-- =============================
-- Table: domain_mention
-- =============================
-- Add canonical columns if missing; keep existing columns for compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain_mention' AND column_name = 'domain'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain_mention ADD COLUMN domain text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain_mention' AND column_name = 'video_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain_mention ADD COLUMN video_id text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain_mention' AND column_name = 'comment_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain_mention ADD COLUMN comment_id text';
  END IF;

  -- Ensure created_at exists with default now()
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domain_mention' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain_mention ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipped add columns on domain_mention: %', SQLERRM;
END$$;

-- Unique constraint on (domain, video_id, comment_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'domain_mention_domain_video_comment_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.domain_mention
             ADD CONSTRAINT domain_mention_domain_video_comment_key
             UNIQUE (domain, video_id, comment_id)';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipped unique constraint on domain_mention: %', SQLERRM;
END$$;

-- =============================
-- Views
-- =============================

-- v_domains_new_today
CREATE OR REPLACE VIEW public.v_domains_new_today AS
SELECT d.domain,
       d.first_seen,
       d.last_seen,
       d.unique_videos,
       d.total_mentions
FROM public.domain d
WHERE d.first_seen::date = current_date
ORDER BY d.first_seen DESC;

-- v_domains_heating (last 48h, by total mentions)
CREATE OR REPLACE VIEW public.v_domains_heating AS
SELECT d.domain,
       d.last_seen,
       d.total_mentions,
       d.unique_videos
FROM public.domain d
WHERE d.last_seen > now() - INTERVAL '48 hours'
ORDER BY d.total_mentions DESC;

-- v_domains_trending (simple 7d slope proxy)
CREATE OR REPLACE VIEW public.v_domains_trending AS
WITH daily AS (
  SELECT dm.domain,
         date_trunc('day', dm.created_at) AS day,
         count(*) AS mentions
  FROM public.domain_mention dm
  WHERE dm.created_at > now() - INTERVAL '7 days'
  GROUP BY 1,2
)
SELECT d.domain,
       COALESCE(sum(daily.mentions), 0) AS mentions_7d,
       d.last_seen,
       d.unique_videos
FROM public.domain d
LEFT JOIN daily ON daily.domain = d.domain
GROUP BY d.domain, d.last_seen, d.unique_videos
ORDER BY mentions_7d DESC NULLS LAST;


