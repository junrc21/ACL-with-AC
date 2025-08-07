import { createPlatformLogger } from '@/shared/utils/logger';
import { Platform } from '@/shared/types/platform.types';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
}

/**
 * Retry attempt result
 */
export interface RetryAttempt<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempt: number;
  totalAttempts: number;
  nextRetryIn?: number;
  shouldRetry: boolean;
}

/**
 * Retry context for tracking attempts
 */
export interface RetryContext {
  operation: string;
  platform?: Platform;
  entityId?: string;
  startTime: Date;
  attempts: number;
  lastError?: Error;
  metadata?: Record<string, any>;
}

/**
 * Retry logic service with exponential backoff
 */
export class RetryLogicService {
  private logger = createPlatformLogger('RETRY', 'RetryLogicService');
  
  // Default retry configurations per platform
  private defaultConfigs: Record<Platform, RetryConfig> = {
    [Platform.HOTMART]: {
      maxAttempts: 5,
      baseDelay: 1000, // 1 second
      maxDelay: 300000, // 5 minutes
      backoffMultiplier: 2,
      jitter: true,
    },
    [Platform.NUVEMSHOP]: {
      maxAttempts: 3,
      baseDelay: 2000, // 2 seconds
      maxDelay: 180000, // 3 minutes
      backoffMultiplier: 2,
      jitter: true,
    },
    [Platform.WOOCOMMERCE]: {
      maxAttempts: 4,
      baseDelay: 1500, // 1.5 seconds
      maxDelay: 240000, // 4 minutes
      backoffMultiplier: 2,
      jitter: true,
    },
  };

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = this.getConfig(context.platform, customConfig);
    let lastError: Error;

    this.logger.info({
      operation: context.operation,
      platform: context.platform,
      entityId: context.entityId,
      config,
    }, 'Starting operation with retry logic');

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        context.attempts = attempt;
        
        this.logger.debug({
          operation: context.operation,
          attempt,
          maxAttempts: config.maxAttempts,
          platform: context.platform,
        }, 'Attempting operation');

        const result = await operation();
        
        this.logger.info({
          operation: context.operation,
          attempt,
          platform: context.platform,
          entityId: context.entityId,
          duration: Date.now() - context.startTime.getTime(),
        }, 'Operation succeeded');

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        context.lastError = lastError;

        this.logger.warn({
          operation: context.operation,
          attempt,
          maxAttempts: config.maxAttempts,
          error: lastError.message,
          platform: context.platform,
          entityId: context.entityId,
        }, 'Operation attempt failed');

        // Check if we should retry
        const shouldRetry = this.shouldRetry(lastError, attempt, config);
        
        if (!shouldRetry || attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        
        this.logger.debug({
          operation: context.operation,
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay,
          platform: context.platform,
        }, 'Waiting before next retry attempt');

        await this.sleep(delay);
      }
    }

    // All attempts failed
    this.logger.error({
      operation: context.operation,
      totalAttempts: config.maxAttempts,
      platform: context.platform,
      entityId: context.entityId,
      finalError: lastError.message,
      totalDuration: Date.now() - context.startTime.getTime(),
    }, 'Operation failed after all retry attempts');

    throw lastError;
  }

  /**
   * Execute operation with retry and return detailed result
   */
  async executeWithRetryDetails<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryAttempt<T>> {
    const config = this.getConfig(context.platform, customConfig);

    try {
      const result = await this.executeWithRetry(operation, context, customConfig);
      
      return {
        success: true,
        result,
        attempt: context.attempts,
        totalAttempts: config.maxAttempts,
        shouldRetry: false,
      };

    } catch (error) {
      const lastError = error instanceof Error ? error : new Error(String(error));
      
      return {
        success: false,
        error: lastError,
        attempt: context.attempts,
        totalAttempts: config.maxAttempts,
        shouldRetry: false,
      };
    }
  }

  /**
   * Calculate delay for next retry attempt using exponential backoff
   */
  calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter if enabled (±25% random variation)
    if (config.jitter) {
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }
    
    return Math.floor(delay);
  }

  /**
   * Determine if operation should be retried based on error type
   */
  shouldRetry(error: Error, attempt: number, config: RetryConfig): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Check error type to determine if retry is appropriate
    const errorMessage = error.message.toLowerCase();
    
    // Don't retry for these types of errors
    const nonRetryableErrors = [
      'validation',
      'authentication',
      'authorization',
      'forbidden',
      'not found',
      'bad request',
      'invalid',
      'malformed',
    ];

    for (const nonRetryable of nonRetryableErrors) {
      if (errorMessage.includes(nonRetryable)) {
        this.logger.debug({
          error: error.message,
          attempt,
          reason: `Non-retryable error: ${nonRetryable}`,
        }, 'Skipping retry due to error type');
        return false;
      }
    }

    // Retry for these types of errors
    const retryableErrors = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'server error',
      'internal error',
      'service unavailable',
      'too many requests',
    ];

    for (const retryable of retryableErrors) {
      if (errorMessage.includes(retryable)) {
        this.logger.debug({
          error: error.message,
          attempt,
          reason: `Retryable error: ${retryable}`,
        }, 'Will retry due to error type');
        return true;
      }
    }

    // Default: retry for unknown errors
    this.logger.debug({
      error: error.message,
      attempt,
      reason: 'Unknown error type, defaulting to retry',
    }, 'Will retry due to unknown error type');
    
    return true;
  }

  /**
   * Get retry configuration for platform
   */
  private getConfig(platform?: Platform, customConfig?: Partial<RetryConfig>): RetryConfig {
    const baseConfig = platform ? this.defaultConfigs[platform] : this.defaultConfigs[Platform.HOTMART];
    return { ...baseConfig, ...customConfig };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration for platform
   */
  updateConfig(platform: Platform, config: Partial<RetryConfig>): void {
    this.defaultConfigs[platform] = { ...this.defaultConfigs[platform], ...config };
    
    this.logger.info({
      platform,
      config: this.defaultConfigs[platform],
    }, 'Retry configuration updated');
  }

  /**
   * Get all retry configurations
   */
  getConfigurations(): Record<Platform, RetryConfig> {
    return { ...this.defaultConfigs };
  }

  /**
   * Create retry context
   */
  createContext(
    operation: string,
    platform?: Platform,
    entityId?: string,
    metadata?: Record<string, any>
  ): RetryContext {
    return {
      operation,
      platform,
      entityId,
      startTime: new Date(),
      attempts: 0,
      metadata,
    };
  }

  /**
   * Get retry statistics (would typically be stored in database)
   */
  getStatistics(): Record<string, any> {
    return {
      configurations: this.defaultConfigs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test retry logic with a mock operation
   */
  async testRetryLogic(
    shouldSucceedAfter: number,
    platform?: Platform
  ): Promise<{
    success: boolean;
    attempts: number;
    totalTime: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let attemptCount = 0;
    const startTime = Date.now();

    const mockOperation = async (): Promise<string> => {
      attemptCount++;
      
      if (attemptCount < shouldSucceedAfter) {
        const error = new Error(`Mock error on attempt ${attemptCount}`);
        errors.push(error.message);
        throw error;
      }
      
      return `Success on attempt ${attemptCount}`;
    };

    const context = this.createContext('test-operation', platform, 'test-entity');

    try {
      await this.executeWithRetry(mockOperation, context);
      
      return {
        success: true,
        attempts: attemptCount,
        totalTime: Date.now() - startTime,
        errors,
      };

    } catch (error) {
      return {
        success: false,
        attempts: attemptCount,
        totalTime: Date.now() - startTime,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
      };
    }
  }
}

// Export singleton instance
export const retryLogicService = new RetryLogicService();

export default RetryLogicService;
