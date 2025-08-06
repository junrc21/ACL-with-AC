import { Request, Response } from 'express';
import { database } from '@/database';
import { config } from '@/config';
import { logger } from '@/shared/utils/logger';
import { asyncHandler } from '@/middlewares/error.middleware';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

/**
 * Detailed health information
 */
interface DetailedHealthResponse extends HealthCheckResponse {
  platform_capabilities: {
    hotmart: string[];
    nuvemshop: string[];
    woocommerce: string[];
  };
  configuration: {
    port: number;
    log_level: string;
    rate_limit: {
      window_ms: number;
      max_requests: number;
    };
  };
}

export class HealthController {
  /**
   * Basic health check endpoint
   * GET /api/acl/health
   */
  public health = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    // Check database health
    const isDatabaseHealthy = await database.healthCheck();
    const databaseResponseTime = Date.now() - startTime;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    // Determine overall health status
    const isHealthy = isDatabaseHealthy;

    const healthResponse: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: config.app.name,
      version: '1.0.0',
      environment: config.app.env,
      checks: {
        database: {
          status: isDatabaseHealthy ? 'up' : 'down',
          responseTime: databaseResponseTime,
        },
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage,
        },
        uptime: Math.floor(process.uptime()),
      },
    };

    // Log health check
    logger.info({
      health: healthResponse,
      responseTime: Date.now() - startTime,
    }, 'Health check performed');

    // Set appropriate status code
    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthResponse);
  });

  /**
   * Detailed health check with additional information
   * GET /api/acl/health/detailed
   */
  public detailedHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    // Get basic health info
    const isDatabaseHealthy = await database.healthCheck();
    const databaseResponseTime = Date.now() - startTime;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    // Determine overall health status
    const isHealthy = isDatabaseHealthy;

    const detailedResponse: DetailedHealthResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: config.app.name,
      version: '1.0.0',
      environment: config.app.env,
      checks: {
        database: {
          status: isDatabaseHealthy ? 'up' : 'down',
          responseTime: databaseResponseTime,
        },
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage,
        },
        uptime: Math.floor(process.uptime()),
      },
      platform_capabilities: {
        hotmart: ['products', 'customers', 'orders', 'payments', 'commissions', 'coupons', 'webhooks'],
        nuvemshop: ['products', 'customers', 'orders', 'payments', 'coupons', 'categories', 'webhooks'],
        woocommerce: ['products', 'customers', 'orders', 'payments', 'coupons', 'categories', 'webhooks'],
      },
      configuration: {
        port: config.app.port,
        log_level: config.logging.level,
        rate_limit: {
          window_ms: config.rateLimit.windowMs,
          max_requests: config.rateLimit.maxRequests,
        },
      },
    };

    // Log detailed health check
    logger.info({
      health: detailedResponse,
      responseTime: Date.now() - startTime,
    }, 'Detailed health check performed');

    // Set appropriate status code
    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(detailedResponse);
  });

  /**
   * Readiness probe for Kubernetes
   * GET /api/acl/health/ready
   */
  public ready = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const isDatabaseHealthy = await database.healthCheck();
    
    if (isDatabaseHealthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connection failed',
      });
    }
  });

  /**
   * Liveness probe for Kubernetes
   * GET /api/acl/health/live
   */
  public live = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });
}
