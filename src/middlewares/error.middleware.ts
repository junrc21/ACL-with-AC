import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/shared/utils/logger';
import { PlatformError } from '@/shared/types/platform.types';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  const timestamp = new Date().toISOString();
  const path = req.path;

  // Log the error
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestId,
    path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  }, 'Request error occurred');

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code || 'API_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof PlatformError) {
    statusCode = 400;
    code = `PLATFORM_ERROR_${error.platform}`;
    message = error.message;
    details = {
      platform: error.platform,
      originalError: error.originalError?.message,
    };
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = {
      issues: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    code = 'DATABASE_ERROR';
    
    switch (error.code) {
      case 'P2002':
        message = 'A record with this data already exists';
        details = { constraint: error.meta?.target };
        break;
      case 'P2025':
        message = 'Record not found';
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        details = { field: error.meta?.field_name };
        break;
      default:
        message = 'Database operation failed';
        details = { code: error.code };
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    message = 'Database validation failed';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      timestamp,
      path,
      ...(details && { details }),
      ...(requestId && { requestId }),
    },
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(
    404,
    `Route ${req.method} ${req.path} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
