# Configure Railway Deployment

## Objective

Set up Railway deployment configuration for the MCP Gateway with proper service configuration, networking, and deployment automation.

## Context

- Sprint: 6
- Dependencies: prompt_21_dockerfile.md
- Related files: `/mcp-gateway/railway.toml`

## Task

Configure Railway deployment for production hosting of the MCP Gateway with proper service configuration and deployment pipeline.

### Requirements

1. Create `railway.toml` configuration:
   - Service configuration
   - Build settings
   - Runtime configuration
   - Health check setup
2. Railway service setup:
   - **Service name**: `mcp-gateway`
   - **Port**: 3333
   - **Health check**: `/health` endpoint
   - **Build command**: Docker build
   - **Start command**: Automatic from Dockerfile
3. Deployment configuration:

   ```toml
   [build]
   builder = "dockerfile"
   dockerfile = "Dockerfile"

   [deploy]
   healthcheckPath = "/health"
   healthcheckTimeout = 10
   restartPolicyType = "always"

   [env]
   PORT = "3333"
   NODE_ENV = "production"
   ```

4. Service configuration:
   - Custom domain setup (optional)
   - SSL/TLS termination
   - Request timeout configuration
   - Resource allocation
5. Deployment pipeline:
   - GitHub integration
   - Automatic deployment on main branch
   - Build artifact caching
   - Deployment rollback capability

### Railway Features

- Zero-downtime deployments
- Automatic scaling (if needed)
- Built-in monitoring
- Log aggregation
- Environment variable management

## Agent to Use

Invoke the **@brightdata** agent to:

- Review Railway deployment best practices
- Suggest service configuration optimizations
- Validate health check and monitoring setup
- Guide on production deployment strategies

## Success Criteria

- [ ] Railway service deployed successfully
- [ ] Health checks pass consistently
- [ ] Automatic deployments work from GitHub
- [ ] Service accessible via public URL
- [ ] Logs available in Railway dashboard
- [ ] Environment variables configured securely

## Notes

- Test deployment in staging environment first
- Configure appropriate resource limits
- Set up monitoring and alerting
- Document deployment and rollback procedures
