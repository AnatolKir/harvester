# Deploy Worker Endpoints

## Objective

Deploy `/discover` and `/harvest` worker endpoints to Railway to resolve 404 errors and restore data pipeline functionality.

## Context

- Sprint: 8
- Dependencies: prompt_02_fix_schema_mismatches.md completed
- Related files: `/worker/`, Railway deployment configuration

## Task

The worker endpoints `/discover` and `/harvest` are returning 404 errors, indicating incomplete or failed Railway deployment. The data pipeline cannot function without these endpoints, contributing to the 86% performance shortfall.

### Current Issues

1. **404 Responses**
   - `GET /discover` returns 404 Not Found
   - `POST /harvest` returns 404 Not Found
   - Worker functionality completely unavailable

2. **Deployment Status Unknown**
   - Railway deployment status unclear
   - No health check endpoint responding
   - Environment variables may not be configured

3. **Pipeline Impact**
   - Discovery jobs cannot trigger worker
   - Comment harvesting completely broken
   - Zero domains being processed

### Required Actions

1. **Deployment Audit**
   - Check Railway deployment status
   - Verify environment variables configured
   - Confirm build and start commands correct

2. **Worker Configuration**
   - Ensure Flask app structure correct
   - Verify route definitions and handlers
   - Test endpoints locally before deployment

3. **Deploy and Validate**
   - Deploy to Railway with proper configuration
   - Test endpoints return expected responses
   - Verify integration with Inngest jobs

4. **Health Monitoring**
   - Implement health check endpoint
   - Add logging for debugging
   - Set up basic monitoring

## Subagent to Use

Invoke the **devops-specialist** to:

- Diagnose Railway deployment issues
- Configure proper environment variables
- Deploy worker with health checks
- Validate endpoint functionality end-to-end

## Success Criteria

- [ ] `/discover` endpoint responds with 200 status
- [ ] `/harvest` endpoint accepts POST requests correctly  
- [ ] Worker deployed successfully on Railway
- [ ] Environment variables configured properly
- [ ] Health check endpoint implemented
- [ ] Integration tests pass for worker endpoints
- [ ] Logging configured for debugging
- [ ] Changes committed with deployment notes

## Implementation Steps

1. **Local Testing**
   ```bash
   cd worker/
   python -m flask run
   curl localhost:5000/discover
   curl -X POST localhost:5000/harvest -d '{"video_id": "test"}'
   ```

2. **Railway Configuration**
   ```bash
   # Check current deployment
   railway status
   railway variables
   
   # Deploy with proper config
   railway up
   ```

3. **Endpoint Validation**
   ```bash
   # Test deployed endpoints
   curl https://[worker-url]/discover
   curl https://[worker-url]/health
   ```

4. **Integration Test**
   - Trigger discovery job manually
   - Verify worker receives and processes request
   - Check data flows to database correctly

## Required Environment Variables

```bash
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
INNGEST_SIGNING_KEY=
WORKER_WEBHOOK_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Health Check Implementation

```python
@app.route('/health')
def health():
    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'endpoints': ['/discover', '/harvest']
    }
```

## Notes

- Verify Railway project has sufficient resources allocated
- Check build logs for any dependency issues
- Ensure Playwright dependencies installed correctly
- Test rate limiting doesn't block health checks

## Handoff Notes

After completion:
- Worker endpoints deployed and responding
- Health monitoring operational
- Ready for Inngest job debugging in prompt_04