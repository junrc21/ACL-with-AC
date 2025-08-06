// Mock database for tests
export const mockPrisma = {
  product: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $on: jest.fn(),
};

export const database = {
  getClient: () => mockPrisma,
  connect: jest.fn(),
  disconnect: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
};

export const prisma = mockPrisma;

export default database;
