# Security Validation Test Suite

This directory contains comprehensive security validation tests for the TikTok Domain Harvester API endpoints.

## Test Files

- **`api-security.test.ts`** - Core API security validation tests focusing on input validation, SQL injection protection, XSS prevention, and schema validation
- **`security-integration.test.ts`** - Integration tests for the security utilities and middleware

## Running the Tests

```bash
# Run all security tests
npm test -- --testMatch="**/__tests__/**/*security*.test.ts"

# Run specific test file
npm test api-security.test.ts
npm test security-integration.test.ts

# Run with coverage
npm test -- --coverage --testMatch="**/__tests__/**/*security*.test.ts"
```

## Test Categories

### 1. Input Validation Tests
- SQL injection attempt detection and prevention
- XSS payload sanitization
- UUID format validation
- Pagination parameter bounds checking
- Enum value validation

### 2. Authentication & Authorization Tests
- Bearer token extraction and validation
- Webhook token timing-safe comparison
- Request ID generation
- Suspicious request detection

### 3. Data Consistency Tests
- JSON payload validation
- Object depth limitation
- Payload size restrictions
- Date range validation

### 4. Rate Limiting Tests
- Client identifier extraction
- Suspicious request pattern detection
- Rate limit header validation

## Security Utilities Tested

The tests validate the functionality of the `SecurityUtils` module:

- `SecurityUtils.SQL` - SQL injection protection
- `SecurityUtils.XSS` - Cross-site scripting prevention
- `SecurityUtils.Input` - General input validation and sanitization
- `SecurityUtils.Auth` - Authentication and authorization utilities
- `SecurityUtils.RateLimit` - Rate limiting security measures
- `SecurityUtils.Data` - Data validation and consistency checks
- `SecurityUtils.Headers` - Security header management

## Adding New Tests

When adding new API endpoints or modifying existing ones:

1. Add input validation tests for any new parameters
2. Include authentication tests if the endpoint requires auth
3. Test error handling and sanitization
4. Validate rate limiting behavior
5. Check for potential injection vulnerabilities

## Test Standards

All security tests should:
- Test both positive and negative cases
- Include boundary value testing
- Validate error handling and sanitization
- Check for information leakage
- Ensure consistent security headers
- Test with malicious inputs representative of real-world attacks