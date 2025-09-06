interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  debug: boolean;
  rateLimits: {
    tiktok: {
      requestsPerMinute: number;
      burstLimit: number;
    };
    api: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  worker: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  cache: {
    ttl: number;
    maxEntries: number;
  };
}

const configs: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    apiUrl: 'http://localhost:3032',
    debug: true,
    rateLimits: {
      tiktok: {
        requestsPerMinute: 30,
        burstLimit: 5,
      },
      api: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
    },
    worker: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    },
    cache: {
      ttl: 60,
      maxEntries: 100,
    },
  },
  staging: {
    name: 'Staging',
    apiUrl: process.env.NEXTAUTH_URL || 'https://staging.tiktok-harvester.com',
    debug: true,
    rateLimits: {
      tiktok: {
        requestsPerMinute: 20,
        burstLimit: 3,
      },
      api: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    },
    worker: {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 45000,
    },
    cache: {
      ttl: 300,
      maxEntries: 500,
    },
  },
  production: {
    name: 'Production',
    apiUrl: process.env.NEXTAUTH_URL || 'https://tiktok-harvester.com',
    debug: false,
    rateLimits: {
      tiktok: {
        requestsPerMinute: 10,
        burstLimit: 2,
      },
      api: {
        requestsPerMinute: 30,
        burstLimit: 5,
      },
    },
    worker: {
      maxRetries: 5,
      retryDelay: 5000,
      timeout: 60000,
    },
    cache: {
      ttl: 600,
      maxEntries: 1000,
    },
  },
};

export function getConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
}

export default getConfig();