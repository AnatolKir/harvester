-- TikTok Domain Harvester - Initial Schema Migration
-- This migration creates the core tables and supporting structures for the MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Videos table - TikTok promoted video metadata
CREATE TABLE video (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id TEXT NOT NULL UNIQUE, -- TikTok video ID
    username TEXT NOT NULL, -- TikTok username who posted
    caption TEXT, -- Video caption/description
    video_url TEXT, -- Full TikTok video URL
    thumbnail_url TEXT, -- Video thumbnail URL
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    is_promoted BOOLEAN DEFAULT true, -- For MVP, all videos are promoted
    is_active BOOLEAN DEFAULT true, -- For soft deletion
    posted_at TIMESTAMPTZ, -- When video was originally posted
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When we first discovered it
    last_crawled_at TIMESTAMPTZ, -- Last time we crawled comments
    metadata JSONB DEFAULT '{}', -- Additional metadata from TikTok API
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table - Comments from videos
CREATE TABLE comment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES video(id) ON DELETE CASCADE,
    comment_id TEXT, -- TikTok comment ID (may be null for some scrapers)
    username TEXT NOT NULL, -- Commenter's username
    text TEXT NOT NULL, -- Comment text content
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    is_reply BOOLEAN DEFAULT false, -- Is this a reply to another comment
    parent_comment_id UUID REFERENCES comment(id) ON DELETE SET NULL, -- For nested comments
    posted_at TIMESTAMPTZ, -- When comment was posted (from TikTok)
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When we discovered it
    metadata JSONB DEFAULT '{}', -- Additional comment metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domains table - Unique domains discovered
CREATE TABLE domain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name TEXT NOT NULL UNIQUE, -- Normalized domain (e.g., "example.com")
    tld TEXT NOT NULL, -- Top-level domain (e.g., "com", "org")
    subdomain TEXT, -- Subdomain if present (e.g., "www", "shop")
    is_suspicious BOOLEAN DEFAULT false, -- Manual flagging for suspicious domains
    is_verified BOOLEAN DEFAULT false, -- Manual verification status
    mention_count INTEGER DEFAULT 0, -- Cached count of mentions
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT, -- Manual notes about the domain
    metadata JSONB DEFAULT '{}', -- Future: DNS, WHOIS, HTTP data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domain mentions table - Links domains to comments/videos
CREATE TABLE domain_mention (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domain(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES video(id) ON DELETE CASCADE,
    mention_text TEXT NOT NULL, -- Exact text that mentioned the domain
    position_start INTEGER, -- Start position in comment text
    position_end INTEGER, -- End position in comment text
    context TEXT, -- Surrounding text for context
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- Extraction confidence (0.00-1.00)
    extraction_method TEXT DEFAULT 'regex', -- How domain was extracted
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Video indexes
CREATE INDEX idx_video_video_id ON video(video_id);
CREATE INDEX idx_video_username ON video(username);
CREATE INDEX idx_video_discovered_at ON video(discovered_at DESC);
CREATE INDEX idx_video_last_crawled_at ON video(last_crawled_at);
CREATE INDEX idx_video_is_active ON video(is_active) WHERE is_active = true;

-- Comment indexes
CREATE INDEX idx_comment_video_id ON comment(video_id);
CREATE INDEX idx_comment_username ON comment(username);
CREATE INDEX idx_comment_discovered_at ON comment(discovered_at DESC);
CREATE INDEX idx_comment_posted_at ON comment(posted_at DESC);
-- Full-text search would require: CREATE INDEX idx_comment_text_gin ON comment USING gin(to_tsvector('english', text));
-- Skipped due to IMMUTABLE function requirement in Supabase

-- Domain indexes
CREATE INDEX idx_domain_name ON domain(domain_name);
CREATE INDEX idx_domain_tld ON domain(tld);
CREATE INDEX idx_domain_first_seen ON domain(first_seen_at DESC);
CREATE INDEX idx_domain_last_seen ON domain(last_seen_at DESC);
CREATE INDEX idx_domain_mention_count ON domain(mention_count DESC);

-- Domain mention indexes
CREATE INDEX idx_domain_mention_domain_id ON domain_mention(domain_id);
CREATE INDEX idx_domain_mention_comment_id ON domain_mention(comment_id);
CREATE INDEX idx_domain_mention_video_id ON domain_mention(video_id);
CREATE INDEX idx_domain_mention_discovered_at ON domain_mention(discovered_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_video_active_discovered ON video(is_active, discovered_at DESC) WHERE is_active = true;
CREATE INDEX idx_domain_mention_domain_discovered ON domain_mention(domain_id, discovered_at DESC);
CREATE INDEX idx_comment_video_discovered ON comment(video_id, discovered_at DESC);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_video_updated_at 
    BEFORE UPDATE ON video 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_updated_at 
    BEFORE UPDATE ON comment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_updated_at 
    BEFORE UPDATE ON domain 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_mention_updated_at 
    BEFORE UPDATE ON domain_mention 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DOMAIN MENTION COUNT TRIGGER
-- =============================================================================

-- Function to update domain mention count
CREATE OR REPLACE FUNCTION update_domain_mention_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE domain 
        SET mention_count = mention_count + 1,
            last_seen_at = NOW()
        WHERE id = NEW.domain_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE domain 
        SET mention_count = GREATEST(mention_count - 1, 0)
        WHERE id = OLD.domain_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for domain mention count
CREATE TRIGGER update_domain_mention_count_trigger
    AFTER INSERT OR DELETE ON domain_mention
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_mention_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE video ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_mention ENABLE ROW LEVEL SECURITY;

-- For MVP, we'll use simple policies that allow all authenticated users to read
-- and service role to write. This can be refined later.

-- Video policies
CREATE POLICY "Allow authenticated users to read videos" ON video
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage videos" ON video
    FOR ALL USING (auth.role() = 'service_role');

-- Comment policies  
CREATE POLICY "Allow authenticated users to read comments" ON comment
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage comments" ON comment
    FOR ALL USING (auth.role() = 'service_role');

-- Domain policies
CREATE POLICY "Allow authenticated users to read domains" ON domain
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage domains" ON domain
    FOR ALL USING (auth.role() = 'service_role');

-- Domain mention policies
CREATE POLICY "Allow authenticated users to read domain mentions" ON domain_mention
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage domain mentions" ON domain_mention
    FOR ALL USING (auth.role() = 'service_role');