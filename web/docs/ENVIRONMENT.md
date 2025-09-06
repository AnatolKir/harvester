# Environment Configuration Guide

## Overview

This project uses environment variables for configuration. All sensitive keys and configuration values are stored in `.env.local` for local development.

## Quick Start

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual values in `.env.local`

3. Validate your environment setup:
   ```bash
   npm run env:validate
   ```

## Required Environment Variables

### Supabase Configuration

- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
  - Example: `https://your-project.supabase.co`
  - Found in: Supabase Dashboard > Settings > API

- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Anonymous key for client-side access
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Found in: Supabase Dashboard > Settings > API > anon public

- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for server-side operations
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Found in: Supabase Dashboard > Settings > API > service_role (secret)
  - ⚠️ **Never expose this key on the client side!**

### Redis Configuration (Upstash)

- **UPSTASH_REDIS_REST_URL**: REST API URL for your Upstash Redis instance
  - Example: `https://your-redis-instance.upstash.io`
  - Found in: Upstash Console > Your Database > REST API > URL

- **UPSTASH_REDIS_REST_TOKEN**: Authentication token for Upstash Redis
  - Example: `AU1-AAIncDE...`
  - Found in: Upstash Console > Your Database > REST API > Token

### NextAuth Configuration

- **NEXTAUTH_SECRET**: Secret for session encryption
  - Generate with: `npm run env:generate-secret`
  - Or: `openssl rand -base64 32`
  - ⚠️ **Must be at least 32 characters**

- **NEXTAUTH_URL**: Base URL for NextAuth callbacks
  - Development: `http://localhost:3032`
  - Production: Your production URL (e.g., `https://yourdomain.com`)

## Optional Environment Variables

### Worker Configuration

- **SUPABASE_URL**: Supabase URL for worker (defaults to NEXT_PUBLIC_SUPABASE_URL)
- **SUPABASE_SERVICE_KEY**: Service key for worker (defaults to SUPABASE_SERVICE_ROLE_KEY)
- **WORKER_WEBHOOK_URL**: Webhook URL for triggering worker jobs

### Inngest Configuration

- **INNGEST_EVENT_KEY**: Event key for Inngest (optional for local development)
- **INNGEST_SIGNING_KEY**: Signing key for webhook validation
- **INNGEST_APP_ID**: Application ID (defaults to 'tiktok-harvester')

## Environment-Specific Configurations

The application supports three environments:

### Development
- Higher rate limits for testing
- Debug mode enabled
- Shorter cache TTLs

### Staging
- Moderate rate limits
- Debug mode enabled
- Medium cache TTLs

### Production
- Conservative rate limits
- Debug mode disabled
- Longer cache TTLs

## Security Best Practices

1. **Never commit `.env.local` or any file containing real secrets**
2. **Keep service role keys secret** - never expose them on the client side
3. **Use different keys for different environments**
4. **Rotate keys regularly**
5. **Use strong, randomly generated secrets**

## Validation

Run validation before deployment:

```bash
npm run env:validate
```

This will check:
- All required variables are present
- Variables match expected formats
- No obvious security issues

## TypeScript Integration

Environment variables are typed and validated using Zod. Access them safely through:

```typescript
import { env, getPublicEnv, getServerEnv } from '@/lib/env';

// Client-side safe variables
const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();

// Server-side only variables
const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
```

## Troubleshooting

### Missing Environment Variables
- Ensure `.env.local` exists and contains all required variables
- Check for typos in variable names
- Verify no extra spaces or quotes in values

### Invalid Format Errors
- Supabase URLs must match pattern: `https://[project].supabase.co`
- Upstash URLs must match pattern: `https://[instance].upstash.io`
- Keys must meet minimum length requirements

### Build Failures
- The build process validates environment variables
- Fix any validation errors before building
- Use `npm run env:validate` to test locally

## Deployment

### Vercel
1. Go to Project Settings > Environment Variables
2. Add all variables from `.env.local`
3. Select appropriate environments (Production/Preview/Development)

### Railway/Fly.io
1. Use their respective CLI or dashboard
2. Set environment variables for the worker service
3. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)