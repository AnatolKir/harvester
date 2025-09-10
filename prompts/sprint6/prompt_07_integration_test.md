# Prompt 07: Integration Test

## Goal

Test the complete pipeline with the MCP gateway to ensure everything works end-to-end.

## Steps

1. Start the MCP gateway locally
2. Configure environment to point to local gateway
3. Manually trigger discovery job
4. Verify videos are found and stored
5. Manually trigger harvesting for one video
6. Verify comments are extracted
7. Check domains appear in database
8. Test error scenarios

## Acceptance Criteria

- Gateway handles both tool calls correctly
- Discovery finds at least 1 video
- Harvesting extracts comments
- Domains are extracted and stored
- No errors in logs
- Circuit breaker doesn't trip
