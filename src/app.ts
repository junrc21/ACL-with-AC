import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@/config';
import { logger } from '@/shared/utils/logger';
import { errorHandler, notFoundHandler } from '@/middlewares/error.middleware';
import { platformExtractor, platformLogger } from '@/middlewares/platform.middleware';
import { validateJsonContentType } from '@/middlewares/validation.middleware';
import { createRouter } from '@/routes';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // In production, you should configure specific allowed origins
      if (config.app.env === 'development') {
        return callback(null, true);
      }
      
      // Add your allowed origins here
      const allowedOrigins = [
        'https://your-frontend-domain.com',
        'https://admin.cyriusx.com',
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-source-platform',
      'x-store-id',
      'x-webhook-signature',
      'x-request-id',
    ],
  }));

  // Compression middleware
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path.includes('/health');
    },
  });
  app.use('/api', limiter);

  // Request ID middleware
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.headers['x-request-id']);
    next();
  });

  // HTTP request logging
  app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] as string,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'x-source-platform': req.headers['x-source-platform'],
          'x-store-id': req.headers['x-store-id'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
          'x-request-id': res.getHeader('x-request-id'),
        },
      }),
    },
  }));

  // Body parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook signature verification
      (req as any).rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Platform extraction middleware for API routes
  app.use('/api/acl', platformExtractor);
  app.use('/api/acl', platformLogger);

  // Content type validation for POST/PUT requests
  app.use('/api/acl', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.path.includes('/health')) {
      return validateJsonContentType(req, res, next);
    }
    next();
  });

  // API routes
  app.use('/api/acl', createRouter());

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
