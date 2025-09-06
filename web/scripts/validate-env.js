#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: {
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co',
    pattern: /^https:\/\/.+\.supabase\.co$/,
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous key for client-side access',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    minLength: 40,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key for server-side operations',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    minLength: 40,
  },
  UPSTASH_REDIS_REST_URL: {
    description: 'Upstash Redis REST API URL',
    example: 'https://your-redis-instance.upstash.io',
    pattern: /^https:\/\/.+\.upstash\.io$/,
  },
  UPSTASH_REDIS_REST_TOKEN: {
    description: 'Upstash Redis authentication token',
    example: 'AU1-AAIncDE...',
    minLength: 20,
  },
};

const optionalEnvVars = {
  SUPABASE_URL: {
    description: 'Supabase URL for worker (defaults to NEXT_PUBLIC_SUPABASE_URL)',
    example: 'https://your-project.supabase.co',
  },
  SUPABASE_SERVICE_KEY: {
    description: 'Service key for worker (defaults to SUPABASE_SERVICE_ROLE_KEY)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  WORKER_WEBHOOK_URL: {
    description: 'Webhook URL for triggering worker jobs',
    example: 'https://your-worker-webhook-url',
  },
  INNGEST_EVENT_KEY: {
    description: 'Event key for Inngest',
    example: 'your-inngest-event-key',
  },
  INNGEST_SIGNING_KEY: {
    description: 'Signing key for webhook validation',
    example: 'your-inngest-signing-key',
  },
  INNGEST_APP_ID: {
    description: 'Application ID for Inngest',
    example: 'tiktok-harvester',
  },
};

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');

  const errors = [];
  const warnings = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`❌ Missing required variable: ${key}`);
      errors.push(`   Description: ${config.description}`);
      errors.push(`   Example: ${config.example}\n`);
      continue;
    }

    if (config.pattern && !config.pattern.test(value)) {
      errors.push(`❌ Invalid format for ${key}`);
      errors.push(`   Expected pattern: ${config.pattern}`);
      errors.push(`   Got: ${value.substring(0, 30)}...\n`);
    }

    if (config.minLength && value.length < config.minLength) {
      errors.push(`❌ ${key} is too short`);
      errors.push(`   Minimum length: ${config.minLength}`);
      errors.push(`   Got: ${value.length} characters\n`);
    }
  }

  for (const [key, config] of Object.entries(optionalEnvVars)) {
    const value = process.env[key];

    if (!value) {
      warnings.push(`⚠️  Optional variable not set: ${key}`);
      warnings.push(`   Description: ${config.description}\n`);
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:\n');
    errors.forEach(error => console.error(error));

    if (warnings.length > 0) {
      console.warn('\nWarnings:\n');
      warnings.forEach(warning => console.warn(warning));
    }

    console.error('\n💡 Create a .env.local file with the required variables.');
    console.error('   See .env.example for reference.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('Warnings:\n');
    warnings.forEach(warning => console.warn(warning));
  }

  console.log('✅ All required environment variables are set!\n');

  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    console.log('🚀 Running in PRODUCTION mode');
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      console.warn('⚠️  Warning: NEXTAUTH_URL is set to localhost in production!');
    }
  } else if (isDev) {
    console.log('🛠️  Running in DEVELOPMENT mode');
  } else {
    console.log(`📦 Running in ${process.env.NODE_ENV || 'unknown'} mode`);
  }
}

if (require.main === module) {
  validateEnv();
}

module.exports = { validateEnv };