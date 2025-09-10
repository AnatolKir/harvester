# Create Dockerfile

## Objective

Create a production-ready Dockerfile for the MCP Gateway with optimized build process, security hardening, and minimal image size.

## Context

- Sprint: 6
- Dependencies: prompt_20_e2e_pipeline.md
- Related files: `/mcp-gateway/Dockerfile`, `/mcp-gateway/.dockerignore`

## Task

Create a multi-stage Docker build that produces a secure, efficient container image for the MCP Gateway server.

### Requirements

1. Create `Dockerfile` with multi-stage build:
   - **Build stage**: Install dependencies, compile TypeScript
   - **Production stage**: Minimal runtime with compiled code only
2. Dockerfile features:
   - Node.js Alpine base image for minimal size
   - Non-root user for security
   - Health check integration
   - Proper layer caching optimization
   - Build argument support for versioning
3. Security considerations:
   - Run as non-privileged user
   - Minimal attack surface
   - No unnecessary packages
   - Secure file permissions
4. Dockerfile structure:

   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build

   # Production stage
   FROM node:18-alpine AS production
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S gateway -u 1001
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY package*.json ./
   USER gateway
   EXPOSE 3333
   HEALTHCHECK CMD curl -f http://localhost:3333/health
   CMD ["node", "dist/server.js"]
   ```

5. Create `.dockerignore`:
   - Exclude development files
   - Exclude tests and documentation
   - Exclude build artifacts
   - Include only production necessities

### Build Optimization

- Use build cache effectively
- Minimize layer count
- Order instructions for optimal caching
- Multi-platform build support (amd64, arm64)

## Agent to Use

Invoke the **@brightdata** agent to:

- Review Docker best practices for MCP services
- Suggest security hardening measures
- Validate build optimization strategies
- Guide on container monitoring integration

## Success Criteria

- [ ] Dockerfile builds successfully
- [ ] Image size optimized (< 150MB)
- [ ] Container runs as non-root user
- [ ] Health check works correctly
- [ ] Build cache optimization effective
- [ ] Security scan passes

## Notes

- Test container locally before deployment
- Validate health check endpoint accessibility
- Consider distroless base image for enhanced security
- Document build arguments and environment variables
