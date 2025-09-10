# Railway Deployment Fix Summary

## Problem
Railway couldn't find the Dockerfile at `worker/Dockerfile` despite multiple configuration attempts.

## Solution Implemented
Created a root-level Dockerfile that properly references the worker directory:

1. **Root Dockerfile** (`/Dockerfile`)
   - Copies files from `worker/` subdirectory
   - Sets up the Python environment with Playwright
   - Configures health checks on port 8080

2. **Railway Configuration** (`/railway.json`)
   - Points to root-level Dockerfile
   - Configures health check endpoint
   - Sets restart policy

3. **Docker Ignore** (`/.dockerignore`)
   - Excludes unnecessary files (web/, node_modules, etc.)
   - Reduces build context size
   - Improves build performance

## Files Created/Modified
- `/Dockerfile` - New root-level Dockerfile for Railway
- `/railway.json` - Simplified Railway configuration
- `/.dockerignore` - Optimize Docker build context
- `/worker/Dockerfile` - Original (kept for reference)

## Deployment Steps

### 1. Commit and Push Changes
```bash
git add Dockerfile railway.json .dockerignore
git commit -m "fix(railway): add root-level Dockerfile for Railway deployment"
git push origin main
```

### 2. Railway Dashboard Configuration
1. Go to Railway dashboard
2. Select your service
3. In Settings > General:
   - Ensure "Root Directory" is set to `/` (empty or root)
   - Remove any "Watch Paths" configuration
4. In Settings > Build:
   - Builder should be "Dockerfile" 
   - Dockerfile Path should be "Dockerfile" or blank
5. In Variables tab, add:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   HEALTH_CHECK_PORT=8080
   HEALTH_CHECK_ENABLED=true
   RATE_LIMIT_BYPASS=true
   PYTHONUNBUFFERED=1
   ```

### 3. Trigger Deploy
- Railway should auto-deploy on push
- Or manually trigger from Railway dashboard

## Alternative Solutions (if above fails)

### Option A: Railway CLI Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Option B: Separate Repository
1. Create new repo with just worker code
2. Move Dockerfile to root of that repo
3. Deploy separate repo to Railway

### Option C: Use Fly.io Instead
```bash
# In worker directory
fly launch
fly deploy
```

## Testing Locally
```bash
# Build image
docker build -t harvester-worker .

# Run container
docker run -p 8080:8080 \
  -e SUPABASE_URL="your_url" \
  -e SUPABASE_SERVICE_KEY="your_key" \
  -e HEALTH_CHECK_PORT=8080 \
  -e HEALTH_CHECK_ENABLED=true \
  harvester-worker

# Test health endpoint
curl http://localhost:8080/health
```

## Expected Outcome
- Railway finds and builds Dockerfile successfully
- Worker starts with health check on port 8080
- Service shows as healthy in Railway dashboard

## Rollback Plan
If issues persist:
1. Remove root-level Dockerfile and railway.json
2. Use Railway CLI or alternative deployment method
3. Consider Fly.io or separate repository approach