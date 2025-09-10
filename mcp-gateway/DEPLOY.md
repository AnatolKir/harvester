# MCP Gateway - Railway Deployment Guide

## Prerequisites

- Railway account (https://railway.app)
- Railway CLI installed (`npm install -g @railway/cli`)
- GitHub repository connected to Railway
- Required environment variables ready

## Deployment Steps

### 1. Initial Setup

#### Via Railway Dashboard

1. Create a new project in Railway
2. Select "Deploy from GitHub repo"
3. Choose your repository and branch (`main`)
4. Railway will automatically detect the Dockerfile

#### Via Railway CLI

```bash
# Login to Railway
railway login

# Link to existing project or create new
railway link

# Deploy current directory
railway up
```

### 2. Environment Variables

Configure these in Railway dashboard under "Variables":

#### Required Variables

```bash
# Service Configuration
PORT=3333
NODE_ENV=production

# API Keys (Required)
BRIGHTDATA_API_KEY=your-brightdata-api-key
TIKTOK_SEARCH_URL=your-tiktok-search-endpoint
TIKTOK_COMMENTS_URL=your-tiktok-comments-endpoint

# Optional Performance Tuning
NODE_OPTIONS=--max-old-space-size=512
NODE_NO_WARNINGS=1

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Custom Domain (Optional)

1. Go to Settings → Domains in Railway dashboard
2. Add custom domain
3. Configure DNS with provided CNAME record
4. SSL certificate will be auto-provisioned

### 4. Monitoring

#### Health Check

- Endpoint: `https://your-app.railway.app/health`
- Expected response: `200 OK` with JSON status

#### Logs

```bash
# View logs via CLI
railway logs

# Follow logs
railway logs -f

# Filter by time
railway logs --since 1h
```

#### Metrics

- Available in Railway dashboard under "Metrics"
- Monitor: CPU, Memory, Network, Response times

### 5. Deployment Commands

```bash
# Manual deployment
railway up

# Deploy specific service
railway up -s mcp-gateway

# Rollback to previous version
railway rollback

# View deployment status
railway status

# View environment variables
railway variables
```

### 6. GitHub Integration

The project is configured for automatic deployments:

1. **Main branch**: Auto-deploys to production
2. **Pull requests**: Creates preview environments
3. **Branch deploys**: Can be configured per branch

To modify:

- Edit `railway.toml` → `[github]` section
- Or configure in Railway dashboard → Settings → GitHub

### 7. Scaling

#### Vertical Scaling (Resources)

Edit in `railway.toml`:

```toml
[deploy.resources]
memoryMin = "256Mi"
memoryMax = "1Gi"
cpuMin = "100m"
cpuMax = "1000m"
```

#### Horizontal Scaling (Replicas)

```toml
[deploy]
numReplicas = 3  # Increase for load distribution
```

### 8. Troubleshooting

#### Build Failures

```bash
# Check build logs
railway logs --build

# Rebuild without cache
railway up --no-cache
```

#### Runtime Issues

```bash
# SSH into container (if enabled)
railway run bash

# Execute commands in container context
railway run npm list
railway run node --version
```

#### Common Issues

1. **Port binding error**
   - Ensure `PORT` env var matches exposed port
   - Check Dockerfile EXPOSE directive

2. **Health check failing**
   - Verify `/health` endpoint is accessible
   - Check application startup time
   - Increase `healthcheckTimeout` if needed

3. **Memory issues**
   - Increase `NODE_OPTIONS` max-old-space-size
   - Adjust memory limits in railway.toml

4. **Build cache issues**
   - Clear cache: `railway up --no-cache`
   - Check `.dockerignore` file

### 9. Production Checklist

- [ ] All environment variables configured
- [ ] Health checks passing
- [ ] Logs are structured (JSON format)
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain
- [ ] Security headers enabled (Helmet)
- [ ] Resource limits appropriate for load
- [ ] Monitoring alerts configured
- [ ] Backup deployment strategy documented
- [ ] Rollback procedure tested

### 10. Rollback Procedure

If deployment fails or issues are detected:

```bash
# View deployment history
railway deployments

# Rollback to previous version
railway rollback

# Or rollback to specific deployment
railway rollback <deployment-id>
```

### 11. CI/CD Pipeline

The project uses GitHub Actions for CI:

1. **On Pull Request**:
   - Runs tests
   - Type checking
   - Linting
   - Creates preview deployment

2. **On Merge to Main**:
   - Runs full test suite
   - Builds Docker image
   - Deploys to production

### 12. Security Best Practices

1. **Never commit secrets** - Use Railway's environment variables
2. **Use non-root user** - Already configured in Dockerfile
3. **Keep dependencies updated** - Regular security audits
4. **Enable rate limiting** - Configured via environment variables
5. **Use HTTPS only** - Railway provides SSL by default
6. **Implement health checks** - Already configured
7. **Monitor logs** - Check for suspicious activity

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: [GitHub Issues](https://github.com/your-org/mcp-gateway/issues)

## Quick Reference

```bash
# Deploy
railway up

# Logs
railway logs -f

# Status
railway status

# Rollback
railway rollback

# Environment
railway variables

# Shell
railway run bash
```
