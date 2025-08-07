import { Request, Response, NextFunction } from 'express';
import { Platform } from '@/shared/types/platform.types';
import { webhookStrategyFactory } from '@/modules/acl/strategies/factories/WebhookStrategyFactory';
import { rateLimiterService } from '@/modules/acl/services/rate-limiter.service';
import { createPlatformLogger } from '@/shared/utils/logger';
import crypto from 'crypto';

const logger = createPlatformLogger('MIDDLEWARE', 'WebhookMiddleware');

/**
 * Extended request interface for webhook data
 */
export interface WebhookRequest extends Request {
  webhook?: {
    platform: Platform;
    signature?: string;
    rawBody: string;
    isValid: boolean;
    isAuthentic: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Middleware to capture raw body for webhook signature validation
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path.includes('/webhooks/')) {
    let rawBody = '';
    
    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });
    
    req.on('end', () => {
      (req as any).rawBody = rawBody;
      
      // Parse JSON body if content-type is application/json
      if (req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(rawBody);
        } catch (error) {
          logger.error({ error, rawBody }, 'Failed to parse JSON body');
          req.body = {};
        }
      }
      
      next();
    });
  } else {
    next();
  }
};

/**
 * Middleware to detect platform from webhook request
 */
export const detectPlatform = (req: Request, res: Response, next: NextFunction): void => {
  const webhookReq = req as WebhookRequest;
  
  // Extract platform from URL path
  const pathParts = req.path.split('/');
  const platformIndex = pathParts.indexOf('webhooks') + 1;
  
  if (platformIndex > 0 && platformIndex < pathParts.length) {
    const platformName = pathParts[platformIndex].toUpperCase();
    
    // Validate platform
    if (Object.values(Platform).includes(platformName as Platform)) {
      webhookReq.webhook = {
        platform: platformName as Platform,
        rawBody: (req as any).rawBody || '',
        isValid: false,
        isAuthentic: false,
        errors: [],
        warnings: [],
      };
      
      logger.debug({
        platform: platformName,
        path: req.path,
        method: req.method,
      }, 'Platform detected from webhook URL');
      
      next();
    } else {
      logger.error({
        platformName,
        path: req.path,
        availablePlatforms: Object.values(Platform),
      }, 'Invalid platform in webhook URL');
      
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: `Invalid platform: ${platformName}`,
          supportedPlatforms: Object.values(Platform),
        },
      });
    }
  } else {
    logger.error({
      path: req.path,
      pathParts,
    }, 'Platform not found in webhook URL');
    
    res.status(400).json({
      success: false,
      error: {
        code: 'PLATFORM_NOT_FOUND',
        message: 'Platform not specified in webhook URL',
        expectedFormat: '/api/acl/webhooks/{platform}',
      },
    });
  }
};

/**
 * Middleware to validate webhook signature
 */
export const validateWebhookSignature = (req: Request, res: Response, next: NextFunction): void => {
  const webhookReq = req as WebhookRequest;
  
  if (!webhookReq.webhook) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_CONTEXT_MISSING',
        message: 'Webhook context not found. Ensure detectPlatform middleware runs first.',
      },
    });
  }

  const { platform } = webhookReq.webhook;
  
  try {
    // Extract signature from headers based on platform
    let signature: string | undefined;
    
    switch (platform) {
      case Platform.HOTMART:
        signature = req.headers['x-hotmart-hottok'] as string;
        break;
      case Platform.NUVEMSHOP:
        signature = req.headers['x-linkedstore-hmac-sha256'] as string;
        break;
      case Platform.WOOCOMMERCE:
        signature = req.headers['x-wc-webhook-signature'] as string;
        break;
    }
    
    webhookReq.webhook.signature = signature;
    
    // Get webhook strategy for platform
    const strategy = webhookStrategyFactory.createStrategy(platform);
    
    // Validate webhook data and signature
    const validation = strategy.validateWebhook(
      req.body,
      signature,
      process.env[`${platform}_WEBHOOK_SECRET`] // Platform-specific secret from env
    );
    
    webhookReq.webhook.isValid = validation.isValid;
    webhookReq.webhook.isAuthentic = validation.isAuthentic;
    webhookReq.webhook.errors = validation.errors;
    webhookReq.webhook.warnings = validation.warnings;
    
    if (!validation.isValid) {
      logger.warn({
        platform,
        errors: validation.errors,
        warnings: validation.warnings,
        signature: signature ? 'present' : 'missing',
      }, 'Webhook validation failed');
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_VALIDATION_FAILED',
          message: 'Webhook validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
      });
    }
    
    if (!validation.isAuthentic) {
      logger.warn({
        platform,
        signature: signature ? 'present' : 'missing',
      }, 'Webhook authentication failed');
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'WEBHOOK_AUTHENTICATION_FAILED',
          message: 'Webhook signature validation failed',
        },
      });
    }
    
    logger.debug({
      platform,
      isValid: validation.isValid,
      isAuthentic: validation.isAuthentic,
      warnings: validation.warnings,
    }, 'Webhook validation passed');
    
    next();
    
  } catch (error) {
    logger.error({
      error,
      platform,
    }, 'Webhook signature validation error');
    
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_VALIDATION_ERROR',
        message: 'Internal error during webhook validation',
      },
    });
  }
};

/**
 * Middleware to apply rate limiting to webhook requests
 */
export const rateLimitWebhooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const webhookReq = req as WebhookRequest;
  
  if (!webhookReq.webhook) {
    return next();
  }

  const { platform } = webhookReq.webhook;
  const identifier = req.ip || 'unknown';
  
  try {
    const rateLimitResult = await rateLimiterService.checkRateLimit(platform, identifier);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': '60', // Requests per minute
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
    });
    
    if (!rateLimitResult.allowed) {
      logger.warn({
        platform,
        identifier,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        retryAfter: rateLimitResult.retryAfter,
      }, 'Webhook rate limit exceeded');
      
      if (rateLimitResult.retryAfter) {
        res.set('Retry-After', Math.ceil(rateLimitResult.retryAfter / 1000).toString());
      }
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many webhook requests',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
      });
    }
    
    logger.debug({
      platform,
      identifier,
      remaining: rateLimitResult.remaining,
    }, 'Webhook rate limit check passed');
    
    next();
    
  } catch (error) {
    logger.error({
      error,
      platform,
      identifier,
    }, 'Rate limit check failed');
    
    // Fail open - allow request if rate limiter is down
    next();
  }
};

/**
 * Middleware to log webhook requests
 */
export const logWebhookRequest = (req: Request, res: Response, next: NextFunction): void => {
  const webhookReq = req as WebhookRequest;
  const startTime = Date.now();
  
  // Log incoming webhook
  logger.info({
    platform: webhookReq.webhook?.platform,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    sourceIp: req.ip,
    signature: webhookReq.webhook?.signature ? 'present' : 'missing',
  }, 'Incoming webhook request');
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    logger.info({
      platform: webhookReq.webhook?.platform,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      success: body?.success || res.statusCode < 400,
    }, 'Webhook request completed');
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Middleware to handle webhook errors
 */
export const handleWebhookErrors = (error: any, req: Request, res: Response, next: NextFunction): void => {
  const webhookReq = req as WebhookRequest;
  
  logger.error({
    error,
    platform: webhookReq.webhook?.platform,
    method: req.method,
    path: req.path,
    body: req.body,
  }, 'Webhook processing error');
  
  // Don't expose internal errors to webhook senders
  res.status(500).json({
    success: false,
    error: {
      code: 'WEBHOOK_PROCESSING_ERROR',
      message: 'Internal error processing webhook',
    },
  });
};

/**
 * Middleware to validate webhook content type
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.get('Content-Type');
  
  if (!contentType || !contentType.includes('application/json')) {
    logger.warn({
      contentType,
      path: req.path,
    }, 'Invalid webhook content type');
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CONTENT_TYPE',
        message: 'Webhook must use application/json content type',
        received: contentType,
      },
    });
  }
  
  next();
};

/**
 * Middleware to validate webhook body size
 */
export const validateBodySize = (maxSize: number = 1024 * 1024) => { // Default 1MB
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn({
        contentLength,
        maxSize,
        path: req.path,
      }, 'Webhook body too large');
      
      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Webhook payload exceeds maximum size',
          maxSize,
          received: contentLength,
        },
      });
    }
    
    next();
  };
};

/**
 * Combined webhook middleware stack
 */
export const webhookMiddleware = [
  validateContentType,
  validateBodySize(),
  captureRawBody,
  detectPlatform,
  logWebhookRequest,
  rateLimitWebhooks,
  validateWebhookSignature,
  handleWebhookErrors,
];
