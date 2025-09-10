import '@testing-library/jest-dom'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.redis.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
process.env.WORKER_WEBHOOK_URL = 'https://test.worker.com/webhook'
process.env.INNGEST_EVENT_KEY = 'test-event-key'
process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

global.fetch = jest.fn()

// Mock NextRequest for API route tests
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Map(Object.entries(options?.headers || {})),
  body: options?.body,
  json: jest.fn().mockResolvedValue(JSON.parse(options?.body || '{}')),
  text: jest.fn().mockResolvedValue(options?.body || ''),
}))

global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  statusText: options?.statusText || 'OK',
  headers: new Map(Object.entries(options?.headers || {})),
  body,
  json: jest.fn().mockResolvedValue(JSON.parse(body || '{}')),
  text: jest.fn().mockResolvedValue(body || ''),
  ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
}))

// Mock NextResponse for API route tests
global.NextResponse = {
  json: jest.fn().mockImplementation((data, options) => ({
    status: options?.status || 200,
    statusText: options?.statusText || 'OK',
    headers: new Map(Object.entries(options?.headers || {})),
    body: JSON.stringify(data),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
  })),
  redirect: jest.fn().mockImplementation((url, status) => ({
    status: status || 302,
    statusText: 'Found',
    headers: new Map([['Location', url]]),
    body: '',
    ok: false,
  })),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      execute: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}))

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
  })),
}))

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      }),
    })),
    {
      tokenBucket: jest.fn(() => 'mocked-token-bucket'),
    }
  ),
}))

jest.mock('inngest', () => ({
  Inngest: jest.fn(() => ({
    createFunction: jest.fn(),
    send: jest.fn(),
  })),
  serve: jest.fn(),
}))

// Mock next/server module
jest.mock('next/server', () => {
  // NextResponse can be used both as a constructor and as an object with methods
  const NextResponseMock = jest.fn().mockImplementation((body, options) => {
    // If body is a ReadableStream, preserve it as-is for testing
    const responseBody = body instanceof global.ReadableStream ? body : body;
    
    return {
      status: options?.status || 200,
      statusText: options?.statusText || 'OK',
      headers: options?.headers || new Headers(),
      body: responseBody,
      json: jest.fn().mockResolvedValue(typeof body === 'string' ? JSON.parse(body) : body),
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
      ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    };
  });
  
  // Add static methods
  NextResponseMock.json = jest.fn().mockImplementation((data, options) => ({
    status: options?.status || 200,
    statusText: options?.statusText || 'OK',
    headers: new Map(Object.entries(options?.headers || {})),
    body: JSON.stringify(data),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
  }));
  
  NextResponseMock.redirect = jest.fn().mockImplementation((url, status) => ({
    status: status || 302,
    statusText: 'Found',
    headers: new Map([['Location', url]]),
    body: '',
    ok: false,
  }));
  
  return {
    NextRequest: jest.fn().mockImplementation((url, options) => {
      const urlObj = new URL(url || 'http://localhost:3000/');
      return {
        url,
        method: options?.method || 'GET',
        headers: new Map(Object.entries(options?.headers || {})),
        body: options?.body,
        json: jest.fn().mockResolvedValue(JSON.parse(options?.body || '{}')),
        text: jest.fn().mockResolvedValue(options?.body || ''),
        nextUrl: {
          pathname: urlObj.pathname,
          searchParams: new URLSearchParams(urlObj.search),
        },
      };
    }),
    NextResponse: NextResponseMock,
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Web APIs for Node.js test environment
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Mock ReadableStream for streaming APIs
global.ReadableStream = class MockReadableStream {
  constructor(underlyingSource) {
    this.underlyingSource = underlyingSource;
    this.chunks = [];
    this.controller = {
      enqueue: jest.fn((chunk) => {
        this.chunks.push(chunk);
      }),
      close: jest.fn(),
      error: jest.fn(),
    };
    
    // Call start method if provided
    if (underlyingSource && underlyingSource.start) {
      underlyingSource.start(this.controller);
    }
    
    // Call pull method to get data
    if (underlyingSource && underlyingSource.pull) {
      // Simulate async pulling of data
      Promise.resolve().then(async () => {
        await underlyingSource.pull(this.controller);
      });
    }
  }
  
  getReader() {
    let chunkIndex = 0;
    const chunks = this.chunks;
    
    return {
      read: jest.fn().mockImplementation(async () => {
        if (chunkIndex < chunks.length) {
          const value = chunks[chunkIndex++];
          return { value, done: false };
        }
        return { value: undefined, done: true };
      }),
      releaseLock: jest.fn(),
    };
  }
}