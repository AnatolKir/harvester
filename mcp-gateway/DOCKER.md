# MCP Gateway Docker Documentation

## Overview

This document describes the Docker setup for the MCP Gateway server, including build optimization, security hardening, and deployment instructions.

## Docker Image Features

### Multi-Stage Build

- **Stage 1 (dependencies)**: Installs production dependencies only
- **Stage 2 (builder)**: Compiles TypeScript to JavaScript
- **Stage 3 (production)**: Minimal runtime with compiled code
- **Stage 4 (development)**: Optional development environment with hot reload

### Security Hardening

- Runs as non-root user (`mcpgateway:nodejs`)
- Read-only filesystem with writable `/tmp` and `/app/logs`
- No unnecessary packages or build tools in production
- Regular security updates via `apk upgrade`
- Capability dropping and privilege restrictions
- Health check endpoint for monitoring

### Optimization

- Alpine Linux base for minimal size (~245MB)
- Layer caching optimization
- Separate dependency installation for better caching
- Production-only dependencies in final image
- Memory limits and CPU constraints

## Quick Start

### Build the Image

```bash
# Build production image
make build

# Build with no cache
docker build --no-cache -t mcp-gateway:latest .

# Build for multiple platforms
make build-multi
```

### Run the Container

```bash
# Run with Docker
make run

# Run with docker-compose
docker-compose up -d

# Run development container
make run-dev
```

### Using Docker Scripts

```bash
# Build script
./docker/build.sh [tag] [--no-cache] [--platform=linux/amd64,linux/arm64]

# Run script
./docker/run.sh [tag] [--env-file=.env] [--port=3333] [-d]
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=production
PORT=3333
LOG_LEVEL=info
BRIGHTDATA_API_URL=https://api.brightdata.com/mcp/v1
BRIGHTDATA_ACCOUNT_ID=your_account_id
BRIGHTDATA_AUTH_USERNAME=your_username
BRIGHTDATA_AUTH_PASSWORD=your_password
```

## Docker Compose

### Production Service

```bash
# Start production service
docker-compose up -d

# View logs
docker-compose logs -f mcp-gateway

# Stop service
docker-compose down
```

### Development Service

```bash
# Start development service with hot reload
docker-compose --profile dev up

# This mounts source code and enables live reloading
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
curl http://localhost:3333/health

# View container health
docker inspect mcp-gateway-server --format='{{.State.Health.Status}}'
```

## Security Scanning

```bash
# Scan with Docker Scout (if available)
docker scout cves mcp-gateway:latest

# Scan with Trivy
trivy image mcp-gateway:latest

# Scan with Snyk
snyk container test mcp-gateway:latest
```

## Resource Limits

The container runs with the following constraints:

- Memory: 512MB limit
- CPU: 1 core limit
- Tmpfs: 100MB for `/tmp`

## Troubleshooting

### View Logs

```bash
docker logs -f mcp-gateway-server
```

### Access Container Shell

```bash
docker exec -it mcp-gateway-server sh
```

### Check Resource Usage

```bash
docker stats mcp-gateway-server
```

### Common Issues

1. **Port already in use**: Change the port mapping in docker-compose.yml or use `--port` flag
2. **Permission denied**: Ensure logs directory has proper permissions
3. **Out of memory**: Increase memory limits in docker-compose.yml
4. **Health check failing**: Check if the application is starting correctly

## Build Arguments

- `NODE_VERSION`: Node.js version (default: 18.20.5)
- `ALPINE_VERSION`: Alpine Linux version (default: 3.20)

## Volumes

- `/app/logs`: Application logs (read-write)

## Exposed Ports

- `3333`: HTTP server port

## Maintenance

### Update Base Image

```bash
docker pull node:18-alpine
make build --no-cache
```

### Clean Up

```bash
# Remove container and image
make clean

# Prune all unused Docker resources
docker system prune -af
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build and push Docker image
  run: |
    docker build -t mcp-gateway:${{ github.sha }} .
    docker tag mcp-gateway:${{ github.sha }} mcp-gateway:latest
    docker push mcp-gateway:latest
```

### GitLab CI Example

```yaml
build:
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Production Deployment

1. Build the image with a specific tag
2. Push to your container registry
3. Deploy to your container platform (Kubernetes, ECS, etc.)
4. Configure environment variables
5. Set up monitoring and alerting
6. Configure auto-scaling if needed

## Performance Optimization Tips

1. Use multi-platform builds for better compatibility
2. Enable BuildKit for improved build performance
3. Use registry caching for faster CI/CD builds
4. Consider distroless images for even smaller size
5. Implement graceful shutdown handling

## Security Best Practices

1. Regularly update base images
2. Scan images before deployment
3. Use secrets management for sensitive data
4. Implement network policies
5. Enable audit logging
6. Use read-only filesystems where possible
7. Limit container capabilities
8. Run security benchmarks (CIS Docker Benchmark)
