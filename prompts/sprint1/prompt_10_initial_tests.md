# Initial Test Suite Creation

## Objective

Create initial test suite for core functionality to ensure system reliability.

## Context

- Sprint: 1
- Dependencies: All previous prompts (testing the integrated system)
- Related files: /web/**tests**/, /worker/tests/, CLAUDE.md

## Task

Implement comprehensive test coverage:

- Unit tests for API endpoints
- Integration tests for database operations
- Component tests for React components
- E2E test for authentication flow
- Worker health check tests
- Rate limiting tests
- Environment validation tests

## Subagents to Use

1. First invoke the **test-runner** agent (.claude/agents/test-runner.md) to:
   - Set up Jest for Next.js testing
   - Configure Pytest for Python worker
   - Create unit tests for all components
   - Write integration tests for APIs
   - Ensure 70%+ code coverage

2. Then invoke the **e2e-tester** agent (.claude/agents/e2e-tester.md) to:
   - Create end-to-end test scenarios
   - Test authentication flows
   - Validate user journeys
   - Test cross-service integrations

3. Finally invoke the **code-reviewer** agent (.claude/agents/code-reviewer.md) to:
   - Review all code from sprint 1
   - Identify critical paths needing tests
   - Fix any issues found during testing
   - Validate code quality standards

## Success Criteria

- [ ] Jest configured for Next.js
- [ ] Pytest configured for Python worker
- [ ] Unit tests for all API endpoints
- [ ] Database connection tests passing
- [ ] Authentication flow tests working
- [ ] Rate limiting tests validate limits
- [ ] All tests passing with make test
- [ ] Code coverage above 70%
- [ ] No critical bugs found

## Notes

Use Jest for JavaScript/TypeScript tests. Use Pytest for Python worker tests. Mock external services (Supabase, Redis) for unit tests. Include performance benchmarks for critical paths.
