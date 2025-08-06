import pino from 'pino';
import { config } from '@/config';

/**
 * Logger configuration based on environment
 */
const loggerConfig = {
  level: config.logging.level,
  ...(config.logging.pretty && config.app.env === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
};

/**
 * Main application logger
 */
export const logger = pino(loggerConfig);

/**
 * Create a child logger with additional context
 */
export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Platform-specific logger
 */
export const createPlatformLogger = (platform: string, operation?: string) => {
  return logger.child({
    platform,
    ...(operation && { operation }),
  });
};

/**
 * Request logger for HTTP requests
 */
export const createRequestLogger = (requestId: string, method: string, url: string) => {
  return logger.child({
    requestId,
    method,
    url,
  });
};

/**
 * Error logger with structured error information
 */
export const logError = (
  error: Error,
  context: Record<string, any> = {}
) => {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, 'Error occurred');
};

/**
 * Performance logger for timing operations
 */
export const logPerformance = (
  operation: string,
  duration: number,
  context: Record<string, any> = {}
) => {
  logger.info({
    operation,
    duration,
    ...context,
  }, `Operation completed in ${duration}ms`);
};

/**
 * Webhook logger for tracking webhook events
 */
export const logWebhook = (
  platform: string,
  eventType: string,
  success: boolean,
  context: Record<string, any> = {}
) => {
  const level = success ? 'info' : 'error';
  logger[level]({
    platform,
    eventType,
    success,
    ...context,
  }, `Webhook ${eventType} ${success ? 'processed successfully' : 'failed'}`);
};

export default logger;
