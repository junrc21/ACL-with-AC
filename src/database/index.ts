import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import { logger } from '@/shared/utils/logger';

/**
 * Prisma client instance with logging and error handling
 */
class DatabaseClient {
  private static instance: DatabaseClient;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      // Disable Prisma logging for now to avoid type issues
      // log: [
      //   {
      //     emit: 'event',
      //     level: 'query',
      //   },
      //   {
      //     emit: 'event',
      //     level: 'error',
      //   },
      //   {
      //     emit: 'event',
      //     level: 'info',
      //   },
      //   {
      //     emit: 'event',
      //     level: 'warn',
      //   },
      // ],
    });

    // Set up logging for Prisma events (disabled for now)
    // this.setupLogging();
  }

  /**
   * Get singleton instance of DatabaseClient
   */
  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to database');
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect from database');
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
      return false;
    }
  }

  /**
   * Setup logging for Prisma events (disabled for TypeScript compatibility)
   */
  private setupLogging(): void {
    // Disabled for now due to TypeScript strict mode issues
    // Will be re-enabled when Prisma types are more compatible
  }
}

// Export singleton instance
export const database = DatabaseClient.getInstance();
export const prisma = database.getClient();

export default database;
