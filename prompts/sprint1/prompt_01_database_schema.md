# Database Schema Setup

## Objective

Create and deploy the core database schema to Supabase for the TikTok Domain Harvester MVP.

## Context

- Sprint: 1
- Dependencies: None (first task)
- Related files: /supabase/migrations/, CLAUDE.md

## Task

Set up the PostgreSQL database schema in Supabase with the following core tables:

- `video` table for TikTok promoted video metadata
- `comment` table for storing video comments
- `domain` table for unique domains discovered
- `domain_mention` table linking domains to comments/videos
- SQL views including `v_domains_new_today`

Implement Row-Level Security (RLS) policies for all tables.

## Subagents to Use

1. First, invoke the **database-specialist** agent (.claude/agents/database-specialist.md) to:
   - Design the core table structure
   - Define foreign key relationships
   - Create proper indexes for performance
   - Implement RLS policies

2. Then, invoke the **schema-designer** agent (.claude/agents/schema-designer.md) to:
   - Create SQL migration files in /supabase/migrations/
   - Design optimized column types and constraints
   - Create SQL views for the dashboard

3. Finally, invoke the **data-seeder** agent (.claude/agents/data-seeder.md) to:
   - Generate realistic seed data script
   - Create test data for all tables

## Success Criteria

- [ ] All core tables created with proper data types
- [ ] Primary keys and foreign keys properly defined
- [ ] Indexes created for query performance
- [ ] RLS policies implemented and tested
- [ ] SQL views created for dashboard data
- [ ] Migration files ready for `make db-push`
- [ ] Seed script ready for `make db-seed`
- [ ] No SQL syntax errors

## Notes

Follow the database schema outlined in CLAUDE.md. Ensure all timestamp fields use UTC timezone. Consider future scalability but keep MVP constraints in mind (no enrichment tables needed yet).
