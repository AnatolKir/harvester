# Railway Deployment Solution - WORKING CONFIGURATION

## ✅ SUCCESSFUL CONFIGURATION

The Railway deployment is now working with the following setup:

### 1. Railway Dashboard Settings
- **Root Directory**: Set to `worker` in Railway dashboard
- **Builder**: Dockerfile (auto-detected)
- **Dockerfile Path**: Leave empty (Railway will find it automatically)

### 2. File Structure Required
```
/harvester (repository root)
├── /worker
│   ├── Dockerfile         # ✅ Railway finds this
│   ├── requirements.txt
│   ├── main.py
│   └── ... (other Python files)
├── /web (Next.js app)
└── ... (other directories)
```

### 3. NO Configuration Files Needed
- ❌ DO NOT add railway.json in worker directory
- ❌ DO NOT add railway.toml in worker directory  
- ❌ DO NOT add Dockerfile at repository root
- ❌ DO NOT add .dockerignore at repository root

Railway will automatically detect and use the Dockerfile when the root directory is set to `worker`.

### 4. Environment Variables (Set in Railway Dashboard)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
HEALTH_CHECK_PORT=8080
HEALTH_CHECK_ENABLED=true
PYTHONUNBUFFERED=1
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
BRIGHTDATA_MCP_API_KEY=your_api_key
WORKER_ENV=production
```

## 🚨 COMMON PITFALLS TO AVOID

### DO NOT:
1. **Add railway.json** - It confuses Railway's path resolution
2. **Add root-level Dockerfile** - Railway uses the worker directory setting
3. **Specify dockerfilePath** in any config - Let Railway auto-detect
4. **Use complex railway.toml configurations** - Keep it simple

### ERRORS YOU MIGHT SEE IF MISCONFIGURED:
- `Dockerfile 'Dockerfile' does not exist` - This means Railway is looking in the wrong place
- `failed to compute cache key` - Railway can't access the build context

## 📝 DEPLOYMENT CHECKLIST

1. ✅ Ensure `worker/Dockerfile` exists
2. ✅ Set Railway root directory to `worker` in dashboard
3. ✅ Remove any railway.json or railway.toml files
4. ✅ Configure environment variables in Railway
5. ✅ Push to GitHub - Railway auto-deploys

## 🔧 IF DEPLOYMENT FAILS

1. **Check Railway Dashboard**:
   - Verify root directory is set to `worker`
   - Ensure no build command overrides
   - Check Dockerfile path is empty or just "Dockerfile"

2. **Check Repository**:
   - Confirm Dockerfile exists at `worker/Dockerfile`
   - Remove any railway.json or railway.toml files
   - Ensure no root-level Dockerfile exists

3. **Last Resort**:
   - Disconnect and reconnect GitHub repository
   - Create new Railway service from scratch
   - Use Railway CLI for manual deployment

## 📅 Last Working Configuration
- **Date**: September 10, 2025
- **Commit**: 71a5505
- **Status**: ✅ Successfully deployed
- **Build Time**: ~2 minutes
- **Health Check**: /health endpoint responding

## 🎯 Key Insight
Railway's root directory setting (`worker`) changes the build context. When set, Railway treats the `worker` directory as the root, so:
- `worker/Dockerfile` becomes just `Dockerfile` from Railway's perspective
- Config files should reference paths relative to this new root
- It's often better to let Railway auto-detect than to over-configure

---

**IMPORTANT**: This configuration is proven to work. Do not add additional Railway configuration files unless absolutely necessary. The simpler the better!