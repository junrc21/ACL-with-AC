import { Request, Response, NextFunction } from 'express';
import { Platform, PlatformHeaders, PLATFORM_CAPABILITIES } from '@/shared/types/platform.types';
import { ApiError } from './error.middleware';
import { logger } from '@/shared/utils/logger';

/**
 * Extended Request interface with platform information
 */
export interface PlatformRequest extends Request {
  platform: Platform;
  storeId?: string;
  platformHeaders: PlatformHeaders;
}

/**
 * Extract platform information from request headers
 */
export const platformExtractor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const platformRequest = req as PlatformRequest;
  
  // Extract platform from headers
  const sourcePlatform = req.headers['x-source-platform'] as string;
  const storeId = req.headers['x-store-id'] as string;
  const webhookSignature = req.headers['x-webhook-signature'] as string;
  const userAgent = req.headers['user-agent'] as string;

  // Validate platform header
  if (!sourcePlatform) {
    throw new ApiError(
      400,
      'Missing x-source-platform header',
      'MISSING_PLATFORM_HEADER'
    );
  }

  // Normalize and validate platform
  const normalizedPlatform = sourcePlatform.toUpperCase();
  if (!Object.values(Platform).includes(normalizedPlatform as Platform)) {
    throw new ApiError(
      400,
      `Invalid platform: ${sourcePlatform}. Supported platforms: ${Object.values(Platform).join(', ')}`,
      'INVALID_PLATFORM'
    );
  }

  // Set platform information on request
  platformRequest.platform = normalizedPlatform as Platform;
  platformRequest.storeId = storeId;
  platformRequest.platformHeaders = {
    'x-source-platform': sourcePlatform,
    ...(storeId && { 'x-store-id': storeId }),
    ...(webhookSignature && { 'x-webhook-signature': webhookSignature }),
    ...(userAgent && { 'user-agent': userAgent }),
  };

  // Log platform information
  logger.info({
    platform: platformRequest.platform,
    storeId: platformRequest.storeId,
    path: req.path,
    method: req.method,
  }, 'Platform extracted from request');

  next();
};

/**
 * Validate platform capabilities for specific operations
 */
export const validatePlatformCapability = (capability: keyof typeof PLATFORM_CAPABILITIES[Platform]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const platformRequest = req as PlatformRequest;
    
    if (!platformRequest.platform) {
      throw new ApiError(
        500,
        'Platform not extracted. Ensure platformExtractor middleware is used first.',
        'PLATFORM_NOT_EXTRACTED'
      );
    }

    const platformCapabilities = PLATFORM_CAPABILITIES[platformRequest.platform];
    
    if (!platformCapabilities[capability]) {
      throw new ApiError(
        400,
        `Platform ${platformRequest.platform} does not support ${capability}`,
        'PLATFORM_CAPABILITY_NOT_SUPPORTED',
        {
          platform: platformRequest.platform,
          capability,
          supportedCapabilities: Object.entries(platformCapabilities)
            .filter(([, supported]) => supported)
            .map(([cap]) => cap),
        }
      );
    }

    next();
  };
};

/**
 * Store ID validation middleware
 */
export const validateStoreId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const platformRequest = req as PlatformRequest;
  
  // Some platforms require store ID for multi-tenant support
  const requiresStoreId = [Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
  
  if (requiresStoreId.includes(platformRequest.platform) && !platformRequest.storeId) {
    throw new ApiError(
      400,
      `Platform ${platformRequest.platform} requires x-store-id header`,
      'MISSING_STORE_ID_HEADER',
      {
        platform: platformRequest.platform,
        requiredHeader: 'x-store-id',
      }
    );
  }

  next();
};

/**
 * Webhook signature validation middleware
 */
export const validateWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const platformRequest = req as PlatformRequest;
  
  // For webhook endpoints, validate signature if present
  if (req.path.includes('/webhooks') && !platformRequest.platformHeaders['x-webhook-signature']) {
    logger.warn({
      platform: platformRequest.platform,
      path: req.path,
    }, 'Webhook received without signature');
    
    // Note: In production, you might want to reject unsigned webhooks
    // For now, we'll log a warning and continue
  }

  next();
};

/**
 * Platform-specific request logging
 */
export const platformLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const platformRequest = req as PlatformRequest;
  
  const startTime = Date.now();
  
  // Log request start
  logger.info({
    platform: platformRequest.platform,
    storeId: platformRequest.storeId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length'],
  }, 'Platform request started');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      platform: platformRequest.platform,
      storeId: platformRequest.storeId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    }, 'Platform request completed');
  });

  next();
};
