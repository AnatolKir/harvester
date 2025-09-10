import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(() => {
  jest.clearAllMocks();
});