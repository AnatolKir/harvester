# TikTok Domain Harvester - Database Schema Documentation

## Overview

This document describes the database schema design for the TikTok Domain Harvester MVP. The schema is optimized for fast ingestion of TikTok video and comment data, efficient domain extraction tracking, and performant dashboard queries.

## Architecture Principles

- **Schema-first development**: Database structure drives application logic
- **UUID primary keys**: Better for distributed systems and privacy
- **Proper foreign key relationships**: Data integrity and referential consistency
- **Strategic indexing**: Optimized for read-heavy dashboard queries
- **Row-Level Security**: Supabase authentication integration
- **Audit trails**: Created/updated timestamps on all tables

## Core Tables

### `video` Table

Stores TikTok promoted video metadata.

**Key Design Decisions:**

- `video_id` is TikTok's unique identifier (TEXT, not our UUID)
- `metadata` JSONB field for flexible API response storage
- Soft deletion via `is_active` boolean
- Separate `posted_at` (TikTok timestamp) vs `discovered_at` (our timestamp)
- Stats fields (view_count, like_count, etc.) for tracking engagement

**Indexes:**

- Primary access via `video_id` and `username`
- Time-based queries via `discovered_at` and `last_crawled_at`
- Active video filtering via `is_active`

### `comment` Table

Stores individual comments from TikTok videos.

**Key Design Decisions:**

- Foreign key to `video` with CASCADE delete
- Support for nested comments via self-referencing `parent_comment_id`
- Full-text search index on comment text using GIN
- Separate TikTok vs discovery timestamps

**Indexes:**

- Access via `video_id` for video-specific queries
- Time-based sorting for recent comments
- Full-text search on comment content
- Username-based filtering

### `domain` Table

Stores unique domains discovered across all comments.

**Key Design Decisions:**

- Normalized domain storage (separate TLD, subdomain)
- Cached `mention_count` for performance (maintained via triggers)
- Manual verification flags (`is_suspicious`, `is_verified`)
- `metadata` JSONB for future DNS/WHOIS enrichment
- First/last seen tracking for trend analysis

HTTP Enrichment (Prompt 41):

- `metadata.http` stores minimal HTTP verifier results:
  - `reachable` (bool), `status` (int), `server` (text), `method` (text), `url` (text), `checked_at` (timestamptz)
- `verified_at` (timestamptz) may be set on success to indicate last HTTP verification time (optional column; if absent, use `metadata.http.checked_at`).

DNS/WHOIS Enrichment (Prompt 46):

- `metadata.dns` stores lightweight DNS signals:
  - `a` (text[]), `aaaa` (text[]), `cname` (text | null), `mx` (bool), `checked_at` (timestamptz)
- `metadata.whois` stores minimal WHOIS fields when configured:
  - `created_at` (timestamptz | null), `expires_at` (timestamptz | null), `registrar` (text | null), `checked_at` (timestamptz)
- `verified_at` may also be set when DNS is resolvable (A/AAAA/CNAME present)

**Indexes:**

- Unique constraint on `domain_name`
- TLD-based filtering and analysis
- Time-based discovery tracking
- Mention count for popularity sorting

### `domain_mention` Table

Junction table linking domains to specific comments and videos.

**Key Design Decisions:**

- Three-way relationship: domain → comment → video
- Position tracking within comment text
- Confidence scoring for extraction quality
- Context storage for manual review
- Method tracking (regex, ML, etc.)

**Indexes:**

- All foreign key relationships indexed
- Time-based discovery queries
- Composite indexes for common join patterns

## SQL Views

### `v_domains_new_today`

**Purpose**: Dashboard view of domains discovered today
**Key Features**:

- Aggregated mention counts and video coverage
- Username arrays for quick video creator overview
- Time-based filtering for "today" discoveries

### `v_domains_top_mentioned`

**Purpose**: Most popular domains by mention volume
**Key Features**:

- Total mentions across all time
- Unique video and commenter counts
- Days since first discovery for trend context

### `v_domains_recent_activity`

**Purpose**: Domains with activity in last 7 days
**Key Features**:

- Recent mention tracking
- Activity velocity indicators
- Fresh vs established domain identification

### `v_videos_with_domains`

**Purpose**: Video-centric view with domain statistics  
**Key Features**:

- Domain mention aggregations per video
- Creator username tracking
- Comment volume correlation

### `v_comments_with_domains`

**Purpose**: Comment analysis with extracted domains
**Key Features**:

- Full comment text with domain highlights
- Video context for each comment
- Mention extraction details

## Utility Functions

### `get_dashboard_stats(start_date, end_date)`

**Purpose**: Generate dashboard summary statistics
**Returns**:

- Total and new counts for domains, videos, comments, mentions
- Average ratios (domains per video, mentions per domain)
- Configurable date range analysis

### `get_trending_domains(days_back)`

**Purpose**: Identify domains with increasing mention velocity
**Algorithm**:

- Compare current period vs previous period mentions
- Calculate growth rate and velocity score
- Sort by trending momentum

### `cleanup_old_data(days_to_keep)`

**Purpose**: Data retention management
**Process**:

- Cascading deletion starting with mentions
- Orphaned domain cleanup
- Configurable retention period

## Performance Optimizations

### Indexing Strategy

1. **Primary Access Patterns**: video_id, domain_name, username lookups
2. **Time-based Queries**: All timestamp columns indexed DESC
3. **Aggregation Support**: Composite indexes for GROUP BY queries
4. **Full-text Search**: GIN index on comment text
5. **Partial Indexes**: Active/verified records only

### Sprint 3 Additions (Prompt 24)

- Ensured presence of critical indexes (idempotent):
  - `video(video_id)` and `video(last_crawled_at)`
  - `comment(video_id)`
  - `domain(last_seen_at)`
- Enforced uniqueness for domain mentions via unique index:
  - `UNIQUE (domain_id, video_id, comment_id)` on `domain_mention`
- Added composite helper index for recent domain discovery:
  - `domain_mention(domain_id, discovered_at DESC)`

### Trigger Optimizations

1. **Automatic Timestamps**: `updated_at` maintenance
2. **Denormalized Counts**: Domain mention count caching
3. **Data Consistency**: Foreign key relationship enforcement

### Query Optimization

1. **Materialized Views**: Considered for heavy aggregations (future)
2. **Strategic JOINs**: Composite indexes support common join patterns
3. **Selective Filtering**: Partial indexes for boolean flags

## Row-Level Security (RLS)

### Policy Design

- **Authenticated Users**: Read access to all tables
- **Service Role**: Full CRUD access for workers
- **Future Enhancement**: User-specific data isolation

### Security Considerations

- All tables have RLS enabled
- Service role bypass for automated workers
- Prepared for multi-tenant expansion

## Data Flow

1. **Discovery**: Worker finds new TikTok videos → `video` table
2. **Comment Harvesting**: Worker extracts comments → `comment` table
3. **Domain Extraction**: Worker parses domains → `domain` + `domain_mention` tables
4. **Dashboard Queries**: UI consumes via optimized views
5. **Maintenance**: Periodic cleanup via utility functions

## Future Enhancements

### Schema Extensions (Post-MVP)

- DNS/WHOIS data in domain metadata
- User preference tables
- Alert/notification tables
- Domain categorization/tagging
- Trend scoring materialized views

### Performance Scaling

- Partition large tables by date
- Read replicas for dashboard queries
- Redis caching layer
- Background job queue tables

## Migration Strategy

### File Organization

- `20250906000001_initial_schema.sql`: Core table structure
- `20250906000002_views_and_functions.sql`: Views and utility functions
- Future migrations: Incremental schema changes

### Rollback Support

- All migrations include DROP statements (commented)
- Foreign key constraints ensure referential integrity
- Backup procedures before major changes

## Monitoring & Maintenance

### Key Metrics to Track

- Table sizes and growth rates
- Index usage and performance
- Query execution times
- Trigger execution performance
- RLS policy effectiveness

### Regular Maintenance

- ANALYZE tables for query plan updates
- VACUUM for space reclamation
- Monitor slow query log
- Review and optimize indexes
- Data retention cleanup

## Testing Strategy

### Data Validation

- Foreign key constraint testing
- Trigger functionality verification
- RLS policy validation
- View accuracy checking

### Performance Testing

- Load testing with realistic data volumes
- Query performance benchmarking
- Index effectiveness measurement
- Concurrent access testing

This schema provides a solid foundation for the MVP while maintaining flexibility for future enhancements and optimizations.
