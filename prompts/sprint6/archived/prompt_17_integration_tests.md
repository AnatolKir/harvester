# Integration Tests with BrightData

## Objective

Create integration tests that validate the MCP Gateway's interaction with BrightData's actual service using real API calls.

## Context

- Sprint: 6
- Dependencies: prompt_16_unit_tests.md
- Related files: `/mcp-gateway/tests/integration/`

## Task

Implement integration tests that verify end-to-end functionality with BrightData's MCP service while being mindful of API quotas and rate limits.

### Requirements

1. Create integration test files:
   - `tests/integration/brightdata-connection.test.ts`
   - `tests/integration/tool-execution.test.ts`
   - `tests/integration/error-scenarios.test.ts`
2. Test categories:
   - **Connection tests**: MCP client connection to BrightData
   - **Tool execution**: Real tool calls with actual responses
   - **Error handling**: Network failures, API errors
   - **Performance**: Response times, throughput
3. Test configuration:
   - Use test environment variables
   - Implement test quota management
   - Configure longer timeouts for network calls
   - Set up test data cleanup
4. Integration test structure:
   ```typescript
   describe('BrightData Integration', () => {
     beforeAll(async () => {
       // Setup test environment
     });

     describe('tool execution', () => {
       test('tiktok.ccl.search returns real results', async () => {
         // Test with real API
       });
     });
   });
   ```
5. Test safety measures:
   - Quota usage monitoring
   - Test isolation (no shared state)
   - Rate limiting compliance
   - Clean test data

### Integration Test Scenarios

**Connection Tests**:

- MCP client connects successfully
- Authentication works with test credentials
- Connection recovery after failure

**Tool Execution Tests**:

- Search tool returns valid TikTok videos
- Comments tool extracts real comments
- Response format matches expectations

**Error Scenarios**:

- Invalid credentials handling
- Network timeout handling
- API rate limit responses

## Agent to Use

Invoke the **@brightdata** agent to:

- Review integration testing strategies for MCP services
- Suggest safe testing approaches for BrightData API
- Validate test isolation and cleanup procedures
- Guide on quota management for testing

## Success Criteria

- [ ] Integration tests connect to BrightData successfully
- [ ] Real tool execution returns valid responses
- [ ] Error scenarios handled correctly
- [ ] Test quota usage stays within limits
- [ ] Tests are reliable and repeatable
- [ ] Performance benchmarks established

## Notes

- Run integration tests sparingly to conserve quota
- Use test-specific credentials if available
- Implement test circuit breakers to prevent quota exhaustion
- Document expected response formats for validation
