# Fix Schema Mismatches

## Objective

Resolve database schema inconsistencies causing 57% test failures and UI query errors.

## Context

- Sprint: 8
- Dependencies: prompt_01_kill_duplicate_servers.md completed
- Related files: `/supabase/migrations/`, `/web/lib/supabase/`, test files

## Task

Integration testing revealed critical schema mismatches between database structure, API queries, and UI expectations. The primary issues are field name inconsistencies and missing SQL views.

### Current Issues

1. **Field Name Conflicts**
   - Code references `video.description` but schema has `video.caption`
   - Queries failing with "column does not exist" errors
   - Inconsistent mapping between frontend and backend

2. **Missing SQL Views**
   - `v_domains_new_today` referenced but not created
   - Dashboard queries failing due to missing views
   - Performance views for aggregated data missing

3. **Test Failures**
   - 57% of integration tests failing
   - Schema-dependent tests breaking
   - API response shape mismatches

### Required Actions

1. **Schema Audit**
   - Compare actual database schema vs code expectations
   - Identify all field name mismatches
   - Document missing views and indexes

2. **Field Standardization**
   - Choose consistent field names (e.g., `description` vs `caption`)
   - Update all references throughout codebase
   - Maintain backward compatibility where possible

3. **Create Missing Views**
   - Implement `v_domains_new_today` and other required views
   - Add indexes for performance
   - Test view queries match UI expectations

4. **Test Validation**
   - Run full test suite after changes
   - Fix any remaining schema-related failures
   - Achieve 100% test pass rate

## Subagent to Use

Invoke the **database-specialist** to:

- Audit schema inconsistencies systematically
- Create migration scripts for schema fixes
- Implement missing SQL views with proper indexes
- Validate all database operations work correctly

## Success Criteria

- [ ] All field name conflicts resolved
- [ ] Missing SQL views created and tested
- [ ] Integration test pass rate at 100%
- [ ] No "column does not exist" errors
- [ ] Dashboard UI loads without query errors
- [ ] API responses match expected schema
- [ ] Migration scripts created for all changes
- [ ] Schema documentation updated

## Implementation Steps

1. **Schema Discovery**
   ```sql
   -- Check actual video table structure
   \d video
   
   -- List all views
   SELECT schemaname, viewname FROM pg_views 
   WHERE schemaname = 'public';
   
   -- Find missing columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'video';
   ```

2. **Code Audit**
   ```bash
   # Find all references to problematic fields
   grep -r "video.description" web/
   grep -r "video.caption" web/
   grep -r "v_domains_new_today" web/
   ```

3. **Fix Strategy**
   - If `description` is used in code but DB has `caption`, update DB
   - If both exist, choose most descriptive name and update code
   - Create aliases in views for transition period

4. **View Creation**
   ```sql
   CREATE VIEW v_domains_new_today AS
   SELECT 
     d.*,
     COUNT(dm.id) as mention_count
   FROM domain d
   LEFT JOIN domain_mention dm ON d.id = dm.domain_id
   WHERE d.created_at >= CURRENT_DATE
   GROUP BY d.id;
   ```

## Notes

- Test each change incrementally to isolate issues
- Use transactions for migration safety
- Keep backup of schema before changes
- Coordinate with frontend team on field name choices

## Handoff Notes

After completion:
- Schema consistency restored
- All tests passing
- Ready for worker deployment fixes in prompt_03