/**
 * Mock PrismaService cho testing
 */
export const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  court: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  walletTransaction: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  bookingCancellation: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  pricingRule: {
    findMany: jest.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

/**
 * Mock BullMQ Queue cho testing
 */
export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  process: jest.fn(),
  on: jest.fn(),
  remove: jest.fn(),
  empty: jest.fn(),
  clean: jest.fn(),
  close: jest.fn(),
};

/**
 * Mock JwtService cho testing
 */
export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' }),
  decode: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' }),
};
