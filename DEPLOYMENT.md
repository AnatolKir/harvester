# TikTok Domain Harvester - Deployment Guide

## Overview

This guide covers deploying the TikTok Domain Harvester to production environments. The application consists of:

- **Frontend**: Next.js application deployed to Vercel
- **Worker**: Python worker deployed to Railway or Fly.io
- **Database**: Supabase (managed PostgreSQL)
- **Redis**: Upstash (managed Redis)
- **Jobs**: Inngest (managed job scheduling)

## Prerequisites

### Required Tools

- Node.js 18+ and npm
- Python 3.11+
- Docker (for worker deployment)
- Git
- Vercel CLI: `npm install -g vercel`
- Railway CLI: `curl -sSL railway.app/cli | sh` (optional)
- Fly CLI: `curl -sSL fly.io/install.sh | sh` (optional)

### Required Accounts & Services

1. **Vercel Account** - For frontend deployment
2. **Railway or Fly.io Account** - For worker deployment
3. **Supabase Project** - Database and authentication
4. **Upstash Account** - Redis for rate limiting
5. **Inngest Account** - Job scheduling (optional)
6. **GitHub Account** - CI/CD and repository

## Environment Variables

### Required Variables

Copy `.env.example` to `.env` and configure:

```bash
# Supabase - Database and Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash - Redis Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# NextAuth - Authentication
NEXTAUTH_SECRET=your_32_character_secret
NEXTAUTH_URL=https://yourdomain.com

# Inngest - Job Scheduling (Optional)
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=signkey-your_signing_key
INNGEST_SERVE_HOST=https://yourdomain.com

# Worker - Background Processing (Optional)
WORKER_WEBHOOK_URL=https://your-worker.railway.app
WORKER_API_KEY=your_worker_api_key

# Slack Alerting (Optional)
SLACK_ALERTS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzzz
ALERTS_DRY_RUN=false

# Admin Security (RBAC & Origins)
ADMIN_EMAILS=admin1@example.com,admin2@example.com
ADMIN_ALLOWED_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com
```

### Environment Validation

Validate your environment setup:

```bash
# Validate environment variables
make env-check

# Run full validation
make validate

# Generate environment template
cd web && node scripts/validate-env.js --generate-template
```

## Deployment Methods

### Method 1: Manual Deployment (Recommended for Testing)

#### Deploy Web Application

```bash
# Option 1: Deploy to staging first
make deploy-web-staging

# Option 2: Deploy directly to production
make deploy-web

# Option 3: Dry run (see what would happen)
make deploy-web-dry
```

#### Deploy Worker

```bash
# Interactive deployment menu
make deploy-worker

# Or deploy to specific platform:
make deploy-worker-railway  # Deploy to Railway
make deploy-worker-fly      # Deploy to Fly.io
make deploy-worker-docker   # Build Docker image only
```

#### Deploy Everything

```bash
# Deploy both web and worker to staging
make deploy-all-staging

# Deploy both web and worker to production
make deploy-all
```

### Method 2: GitHub Actions (Automated CI/CD)

#### Setup GitHub Secrets

Configure the following secrets in your GitHub repository:

**Vercel Secrets:**

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
VERCEL_PROJECT_ID_STAGING=your_staging_project_id
```

**Environment Secrets (for each environment):**

```
# Production
NEXT_PUBLIC_SUPABASE_URL_PROD=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY_PROD=prod_service_key
UPSTASH_REDIS_REST_URL_PROD=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN_PROD=prod_redis_token
NEXTAUTH_SECRET_PROD=prod_32_char_secret

# Staging
NEXT_PUBLIC_SUPABASE_URL_STAGING=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING=staging_anon_key
SUPABASE_SERVICE_ROLE_KEY_STAGING=staging_service_key
UPSTASH_REDIS_REST_URL_STAGING=https://staging-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN_STAGING=staging_redis_token
NEXTAUTH_SECRET_STAGING=staging_32_char_secret
```

**Worker Platform Secrets:**

```
# For Railway deployment
RAILWAY_TOKEN=your_railway_token
RAILWAY_TOKEN_STAGING=your_staging_railway_token

# For Fly.io deployment
FLY_API_TOKEN=your_fly_token
```

#### Automated Workflows

**Continuous Integration:**

- Pushes and PRs trigger CI pipeline
- Runs tests, linting, and security scans
- Validates environment configuration

**Staging Deployment:**

- Pushes to `develop` branch auto-deploy to staging
- Manual trigger available for any branch

**Production Deployment:**

- Manual workflow dispatch from `main` branch
- Requires confirmation checkbox
- Supports selective deployment (web only, worker only)

#### Trigger Deployments

```bash
# Staging: Push to develop branch
git checkout develop
git push origin develop

# Production: Use GitHub UI
# Go to Actions tab → "Deploy to Production" → "Run workflow"
# Select options and confirm deployment
```

## Platform-Specific Setup

### Vercel Configuration

1. **Connect Repository:**

   ```bash
   cd web
   vercel --confirm
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required environment variables
   - Set appropriate environments (Production, Preview, Development)

3. **Custom Domain (Optional):**
   - Go to Vercel Dashboard → Project → Settings → Domains
   - Add your custom domain

### Railway Setup

1. **Initialize Project:**

   ```bash
   cd worker
   railway login
   railway init
   ```

2. **Configure Variables:**

   ```bash
   railway variables set SUPABASE_URL=your_url
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add other variables
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

### Fly.io Setup

1. **Initialize App:**

   ```bash
   cd worker
   fly launch --no-deploy --generate-name
   ```

2. **Set Secrets:**

   ```bash
   fly secrets set SUPABASE_URL=your_url
   fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add other secrets
   ```

3. **Deploy:**
   ```bash
   fly deploy
   ```

### Supabase Setup

1. **Create Project:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project
   - Note down URL and keys

2. **Apply Migrations:**

   ```bash
   make db-push
   ```

3. **Setup RLS Policies:**
   - Policies are included in migration files
   - Verify in Supabase Dashboard → Authentication → Policies

### Upstash Setup

1. **Create Database:**
   - Go to [Upstash Console](https://console.upstash.com)
   - Create new Redis database
   - Copy REST URL and token

## Health Checks & Monitoring

### Application Health

```bash
# Check web application health
curl https://yourdomain.com/api/health

# Check worker health (if health endpoint configured)
curl https://your-worker.railway.app/health
```

### Monitoring Setup

**Vercel:**

- Built-in analytics and performance monitoring
- Error tracking in dashboard

**Railway:**

- Built-in metrics and logging
- Custom health checks supported

**Fly.io:**

- Built-in health checks (configured in fly.toml)
- Metrics available in dashboard

**Supabase:**

- Database metrics in dashboard
- Query performance insights

## Rollback Procedures

### Web Application Rollback

```bash
# Using Makefile
make rollback-web

# Using Vercel CLI directly
cd web
vercel ls  # List deployments
vercel rollback [deployment-url]
```

### Worker Rollback

**Railway:**

```bash
railway rollback
```

**Fly.io:**

```bash
fly releases  # List releases
fly releases rollback [version]
```

### Database Rollback

**Note:** Database rollbacks are complex. Always backup before deployments.

```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Security Considerations

### Environment Variables

- Never commit secrets to git
- Use different secrets for staging/production
- Rotate secrets regularly

### Access Control

- Use least-privilege principles
- Regular audit of service access
- Enable 2FA where available

### Network Security

- HTTPS only in production
- Proper CORS configuration
- Rate limiting enabled

### Database Security

- Row Level Security (RLS) enabled
- Regular security updates
- Monitor for suspicious activity

## Performance Optimization

### Web Application

- Next.js automatic optimizations
- Image optimization enabled
- Static generation where possible
- CDN via Vercel Edge Network

### Worker

- Resource limits configured
- Auto-scaling enabled
- Health check timeouts set
- Playwright browser optimization

### Database

- Connection pooling via Supabase
- Proper indexing on queries
- Regular VACUUM and ANALYZE

### Redis

- Connection pooling
- Proper expiration policies
- Memory usage monitoring

## Cost Estimation

### Vercel

- **Hobby**: $0/month (personal projects)
- **Pro**: $20/month (team projects)
- **Enterprise**: Custom pricing

### Railway

- **Starter**: $5/month (basic apps)
- **Developer**: $10/month (production apps)
- **Team**: $20/month (team collaboration)

### Fly.io

- **Shared CPU**: ~$5-15/month
- **Dedicated CPU**: ~$30-60/month
- Based on usage and resource allocation

### Supabase

- **Free Tier**: $0/month (up to 500MB, 2 projects)
- **Pro**: $25/month (8GB, unlimited projects)
- **Team**: $599/month (team features)

### Upstash

- **Free Tier**: $0/month (10K requests/day)
- **Pay as you scale**: ~$0.20/100K requests

**Total Estimated Monthly Cost:**

- **Development**: $0-10/month
- **Small Production**: $50-100/month
- **Medium Production**: $150-300/month

## Troubleshooting

### Common Issues

**Build Failures:**

```bash
# Clear cache and rebuild
make clean
make install
make deploy-web
```

**Environment Variable Issues:**

```bash
# Validate environment
make validate-env-vars

# Check specific variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

**Database Connection Issues:**

```bash
# Test database connection
make db-push

# Check Supabase project status
# Visit Supabase dashboard
```

**Worker Deployment Issues:**

```bash
# Test Docker build locally
make deploy-worker-docker

# Check logs
railway logs  # for Railway
fly logs      # for Fly.io
```

### Getting Help

1. **Check deployment logs** in platform dashboards
2. **Verify environment variables** are set correctly
3. **Test locally first** with `make dev` and `make worker`
4. **Check service status** pages for platform outages
5. **Review error messages** carefully for specific issues

## Maintenance

### Regular Tasks

**Weekly:**

- Check application health and performance
- Review error logs and metrics
- Verify backup processes

**Monthly:**

- Update dependencies
- Review and rotate secrets
- Check cost optimization opportunities
- Security audit

**Quarterly:**

- Platform updates and migrations
- Performance optimization review
- Disaster recovery testing

### Updates

```bash
# Update dependencies
npm update          # In web/
pip freeze > requirements.txt  # In worker/

# Test updates
make test
make validate

# Deploy updates
make deploy-all
```

---

For additional help or questions, check the project repository issues or create a new issue with the `deployment` label.
