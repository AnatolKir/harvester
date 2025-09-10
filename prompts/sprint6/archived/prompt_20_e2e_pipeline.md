# End-to-End Pipeline Test

## Objective

Create end-to-end pipeline tests that validate the complete domain harvesting flow from TikTok discovery through comment extraction to domain storage.

## Context

- Sprint: 6
- Dependencies: prompt_19_error_scenarios.md
- Related files: `/mcp-gateway/tests/e2e/pipeline.test.ts`

## Task

Implement comprehensive end-to-end tests that simulate the entire domain harvesting pipeline using the MCP Gateway.

### Requirements

1. Create e2e test file:
   - `tests/e2e/pipeline.test.ts`
   - `tests/e2e/helpers/` for test utilities
   - `tests/e2e/fixtures/` for test data
2. Pipeline test flow:
   - **Discovery**: Use `tiktok.ccl.search` to find promoted videos
   - **Comment harvesting**: Use `tiktok.comments.page` to extract comments
   - **Domain extraction**: Process comments for domains (mock/stub)
   - **Data validation**: Verify data quality and format
3. Test scenarios:
   - **Happy path**: Complete successful pipeline execution
   - **Partial failures**: Some videos fail, others succeed
   - **Data quality**: Verify extracted domains are valid
   - **Performance**: Pipeline completes within time limits
4. E2E test structure:
   ```typescript
   describe('Domain Harvesting Pipeline', () => {
     test('complete pipeline from search to domains', async () => {
       // 1. Search for promoted videos
       const videos = await searchTool.execute({...});

       // 2. Extract comments from videos
       const comments = await Promise.all(
         videos.map(v => commentsTool.execute({video_url: v.url}))
       );

       // 3. Validate data quality
       expect(comments).toBeDefined();
       expect(extractDomains(comments)).toContainValidDomains();
     });
   });
   ```
5. Test validation:
   - Data format compliance
   - Response time requirements
   - Error handling throughout pipeline
   - Resource cleanup after tests

### Pipeline Validation

**Data Quality Checks**:

- Video metadata completeness
- Comment text extraction accuracy
- Domain extraction precision
- No data corruption through pipeline

**Performance Validation**:

- Pipeline completes within 5 minutes
- Memory usage stays reasonable
- No resource leaks
- Proper connection cleanup

## Agent to Use

Invoke the **@brightdata** agent to:

- Review end-to-end testing strategies for MCP pipelines
- Suggest data validation approaches
- Validate pipeline performance expectations
- Guide on test environment setup

## Success Criteria

- [ ] Complete pipeline executes successfully
- [ ] Data flows correctly through all stages
- [ ] Performance meets requirements
- [ ] Error handling works at each stage
- [ ] Data quality validation passes
- [ ] Tests are reliable and repeatable

## Notes

- Use realistic test data that matches production patterns
- Consider test quota usage for BrightData calls
- Validate against actual domain extraction logic
- Document pipeline performance characteristics
