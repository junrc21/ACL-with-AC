import { config } from '@/config';
import { logger } from '@/shared/utils/logger';
import { database } from '@/database';
import { createApp } from '@/app';

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.disconnect();
    logger.info('Database disconnected successfully');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

/**
 * Start the ACL service
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // Create Express application
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.app.port, () => {
      logger.info({
        port: config.app.port,
        env: config.app.env,
        service: config.app.name,
      }, 'ACL Service started successfully');
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error({ error }, 'Server error occurred');
      process.exit(1);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.fatal({ error }, 'Uncaught exception occurred');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.fatal({
        reason,
        promise,
      }, 'Unhandled promise rejection occurred');
      process.exit(1);
    });

  } catch (error) {
    logger.fatal({ error }, 'Failed to start ACL service');
    process.exit(1);
  }
};

// Start the server
startServer();
