// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Mock the logger module FIRST (before any other imports)
jest.mock('@/shared/utils/logger', () => ({
  createPlatformLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  }),
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  }),
}));

// Mock database URL for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock the database module
jest.mock('@/database', () => require('./__mocks__/@/database'));

// Global test setup
beforeAll(async () => {
  // Setup test database or mocks
});

afterAll(async () => {
  // Cleanup test database or mocks
});

// Global test utilities
(global as any).testUtils = {
  createMockPlatformRequest: (platform: string, storeId?: string) => ({
    platform,
    storeId,
    platformHeaders: {
      'x-source-platform': platform,
      ...(storeId && { 'x-store-id': storeId }),
    },
    headers: {
      'x-source-platform': platform,
      ...(storeId && { 'x-store-id': storeId }),
    },
    body: {},
    query: {},
    params: {},
  }),
};
