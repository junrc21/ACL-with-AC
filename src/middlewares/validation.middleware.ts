import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './error.middleware';
import { logger } from '@/shared/utils/logger';

/**
 * Request validation targets
 */
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Validation options
 */
export interface ValidationOptions {
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Create validation middleware for Zod schemas
 */
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = 'body',
  _options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      
      // Log validation attempt
      logger.debug({
        target,
        path: req.path,
        method: req.method,
      }, 'Validating request data');

      // Validate data with Zod
      const validatedData = schema.parse(dataToValidate);
      
      // Replace request data with validated data
      (req as any)[target] = validatedData;
      
      logger.debug({
        target,
        path: req.path,
        method: req.method,
      }, 'Request data validation successful');

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({
          target,
          path: req.path,
          method: req.method,
          errors: error.issues,
        }, 'Request validation failed');
        
        next(error);
      } else {
        logger.error({
          error,
          target,
          path: req.path,
          method: req.method,
        }, 'Unexpected validation error');
        
        next(new ApiError(
          500,
          'Validation error occurred',
          'VALIDATION_SYSTEM_ERROR'
        ));
      }
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema, options?: ValidationOptions) => {
  return validate(schema, 'body', options);
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema, options?: ValidationOptions) => {
  return validate(schema, 'query', options);
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: ZodSchema, options?: ValidationOptions) => {
  return validate(schema, 'params', options);
};

/**
 * Validate request headers
 */
export const validateHeaders = (schema: ZodSchema, options?: ValidationOptions) => {
  return validate(schema, 'headers', options);
};

/**
 * Content type validation middleware
 */
export const validateContentType = (expectedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      throw new ApiError(
        400,
        'Content-Type header is required',
        'MISSING_CONTENT_TYPE'
      );
    }

    const isValidType = expectedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      throw new ApiError(
        415,
        `Unsupported Content-Type: ${contentType}. Expected: ${expectedTypes.join(', ')}`,
        'UNSUPPORTED_CONTENT_TYPE',
        {
          received: contentType,
          expected: expectedTypes,
        }
      );
    }

    next();
  };
};

/**
 * JSON content type validation
 */
export const validateJsonContentType = validateContentType(['application/json']);

/**
 * Request size validation middleware
 */
export const validateRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new ApiError(
        413,
        `Request too large. Maximum size: ${maxSizeBytes} bytes`,
        'REQUEST_TOO_LARGE',
        {
          maxSize: maxSizeBytes,
          receivedSize: parseInt(contentLength, 10),
        }
      );
    }

    next();
  };
};

/**
 * Required fields validation for dynamic objects
 */
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req.body;
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new ApiError(
        400,
        `Missing required fields: ${missingFields.join(', ')}`,
        'MISSING_REQUIRED_FIELDS',
        {
          missingFields,
          requiredFields,
        }
      );
    }

    next();
  };
};
