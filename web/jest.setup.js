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
  Ratelimit: jest.fn(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }),
  })),
}))

jest.mock('inngest', () => ({
  Inngest: jest.fn(() => ({
    createFunction: jest.fn(),
    send: jest.fn(),
  })),
  serve: jest.fn(),
}))

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