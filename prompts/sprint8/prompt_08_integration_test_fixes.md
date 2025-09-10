# Integration Test Fixes

## Objective

Fix all failing integration tests to achieve 100% pass rate and validate the complete system functionality.

## Context

- Sprint: 8
- Dependencies: prompt_07_optimize_discovery_rate.md completed  
- Related files: `/web/tests/`, `/worker/tests/`, test configuration

## Task

With all infrastructure fixes complete, run comprehensive integration tests and fix any remaining issues to achieve 100% pass rate. This validates that all previous fixes are working together correctly.

### Current Issues

1. **High Failure Rate**
   - 57% integration test failure rate
   - Unknown remaining issues after infrastructure fixes
   - Tests may reveal edge cases or regressions

2. **End-to-End Validation**
   - Need to verify complete data pipeline works
   - UI integration with backend services
   - API contract validation

3. **System Reliability**
   - Tests should pass consistently
   - No flaky or intermittent failures
   - Robust error handling validation

### Required Actions

1. **Test Execution**
   - Run complete integration test suite
   - Identify all failing tests and root causes
   - Document test failures and patterns

2. **Issue Resolution**
   - Fix schema-related test failures
   - Resolve API integration issues
   - Address timing or race condition problems

3. **End-to-End Validation**
   - Test complete discovery → harvest → UI flow
   - Validate data consistency across components
   - Ensure error handling works correctly

4. **Test Suite Health**
   - Fix flaky tests and improve reliability
   - Add missing test coverage for critical paths
   - Update tests to match current implementation

## Subagent to Use

Invoke the **test-runner** to:

- Execute comprehensive integration test suite
- Analyze test failures and identify root causes
- Fix failing tests and improve test reliability
- Validate end-to-end system functionality

## Success Criteria

- [ ] Integration test pass rate at 100%
- [ ] No failing tests in the complete suite
- [ ] End-to-end pipeline test passes
- [ ] UI integration tests working
- [ ] API contract tests validated
- [ ] Test execution time reasonable (<10 minutes)
- [ ] No flaky or intermittent test failures
- [ ] Test documentation updated

## Implementation Steps

1. **Test Suite Execution**
   ```bash
   # Run all integration tests
   npm run test:integration
   
   # Run specific test categories
   npm run test:api
   npm run test:database
   npm run test:worker
   ```

2. **Failure Analysis**
   ```bash
   # Analyze test output
   npm run test:integration -- --verbose
   npm run test:integration -- --detectOpenHandles
   
   # Generate test report
   npm run test:integration -- --coverage
   ```

3. **Common Fix Categories**
   - Database schema mismatches
   - API response format changes
   - Timing issues with async operations
   - Environment variable configuration
   - Mock data and fixtures

4. **End-to-End Test**
   ```typescript
   describe('Complete Pipeline', () => {
     it('discovers videos, harvests comments, extracts domains', async () => {
       // Trigger discovery job
       // Wait for completion
       // Verify data in database
       // Check UI displays correctly
     });
   });
   ```

## Test Categories to Validate

### 1. Database Tests
- Schema consistency
- Migration compatibility
- View functionality
- Query performance

### 2. API Tests  
- Route handlers respond correctly
- Authentication works
- Error handling proper
- Response schemas match

### 3. Worker Tests
- Endpoints accessible
- Job processing works
- Error handling robust
- Rate limiting respected

### 4. Integration Tests
- End-to-end data flow
- UI displays data correctly
- Jobs trigger and complete
- Error recovery works

### 5. Performance Tests
- Response times acceptable
- Memory usage stable
- No resource leaks
- Concurrent operation handling

## Common Failure Patterns

### Schema Issues
- Field name mismatches
- Missing columns or tables
- Incorrect data types
- View definition errors

### Timing Issues
- Race conditions in async code
- Insufficient wait times for operations
- Database transaction conflicts
- Job scheduling timing

### Configuration Issues
- Missing environment variables
- Incorrect API endpoints
- Authentication failures
- Rate limit configuration

## Test Improvement Areas

1. **Flaky Test Elimination**
   - Add proper waits for async operations
   - Use deterministic test data
   - Implement retry logic where appropriate

2. **Better Error Messages**
   - Descriptive assertion messages
   - Include context in failure output
   - Log intermediate state for debugging

3. **Test Data Management**
   - Clean test database between runs
   - Use consistent test fixtures
   - Isolate test data from production

## Recovery Procedures

If tests still fail after fixes:

1. **Isolate the Issue**
   - Run individual failing tests
   - Check test environment setup
   - Verify test data consistency

2. **Debug Systematically**
   - Add logging to test code
   - Inspect database state during tests
   - Check network requests and responses

3. **Update Test Expectations**
   - Align tests with current implementation
   - Update mock data and fixtures
   - Revise API contracts if needed

## Notes

- Run tests in clean environment to avoid state issues
- Check both unit and integration test suites
- Verify tests work in CI/CD environment
- Document any test environment requirements

## Handoff Notes

After completion:
- All integration tests passing at 100%
- System fully validated end-to-end
- Sprint 8 objectives achieved
- System ready for production monitoring