// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

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
