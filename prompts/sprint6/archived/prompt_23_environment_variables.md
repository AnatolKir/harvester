# Set Up Environment Variables

## Objective

Configure all required environment variables for the MCP Gateway deployment with proper security and validation.

## Context

- Sprint: 6
- Dependencies: prompt_22_railway_deployment.md
- Related files: `/mcp-gateway/.env.example`, Railway environment config

## Task

Set up comprehensive environment variable configuration for production deployment with proper validation and security practices.

### Requirements

1. Create `.env.example` with all required variables:

   ```bash
   # Server Configuration
   PORT=3333
   NODE_ENV=production
   LOG_LEVEL=info

   # BrightData Configuration
   BRIGHTDATA_MCP_URL=wss://mcp.brightdata.com/ws
   BRIGHTDATA_API_KEY=your_api_key_here
   BRIGHTDATA_USER_ID=your_user_id_here

   # Redis Configuration (for caching/rate limiting)
   REDIS_URL=redis://localhost:6379
   REDIS_PASSWORD=

   # Circuit Breaker Configuration
   CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
   CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000

   # Rate Limiting
   RATE_LIMIT_GLOBAL=100
   RATE_LIMIT_PER_TOOL_SEARCH=30
   RATE_LIMIT_PER_TOOL_COMMENTS=60

   # Cache Configuration
   CACHE_TTL_SEARCH=600
   CACHE_TTL_COMMENTS=300

   # Health Check Configuration
   HEALTH_CHECK_TIMEOUT=5000
   ```

2. Environment validation:
   - Required variable checking on startup
   - Type validation (numbers, URLs, etc.)
   - Sensible defaults where appropriate
   - Clear error messages for missing variables
3. Railway environment setup:
   - Configure all production variables
   - Use Railway's secret management
   - Set up environment-specific overrides
4. Security considerations:
   - No sensitive data in code or logs
   - Environment-specific configurations
   - Proper secret rotation capabilities
5. Configuration validation:

   ```typescript
   interface Config {
     port: number;
     nodeEnv: string;
     brightData: {
       mcpUrl: string;
       apiKey: string;
       userId: string;
     };
     redis: {
       url: string;
       password?: string;
     };
   }

   function validateConfig(): Config {
     // Validation logic
   }
   ```

### Environment Configuration

**Development**: Local development with test credentials
**Staging**: Pre-production testing environment
**Production**: Live environment with production credentials

## Agent to Use

Invoke the **@brightdata** agent to:

- Review environment configuration for MCP services
- Suggest security best practices for credential management
- Validate configuration validation approach
- Guide on environment-specific settings

## Success Criteria

- [ ] All required environment variables documented
- [ ] Environment validation works on startup
- [ ] Railway environment configured securely
- [ ] No sensitive data exposed in logs
- [ ] Configuration supports multiple environments
- [ ] Clear error messages for misconfiguration

## Notes

- Use Railway's built-in secret management
- Test configuration validation thoroughly
- Document all environment variables and their purposes
- Plan for configuration updates without redeployment
