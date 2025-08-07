import { Redis } from 'ioredis';
import { getRedisClient } from '@/shared/utils/redis';
import { Platform } from '@/shared/types/platform.types';
import { RateLimitConfig } from '@/shared/types/webhook.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * Rate limiter service for webhook processing
 */
export class RateLimiterService {
  private redis: Redis;
  private logger = createPlatformLogger('RATE_LIMITER', 'RateLimiterService');
  
  // Default rate limit configurations per platform
  private defaultConfigs: Record<Platform, RateLimitConfig> = {
    [Platform.HOTMART]: {
      platform: Platform.HOTMART,
      maxRequestsPerMinute: 100,
      maxRequestsPerHour: 1000,
      burstLimit: 20,
      retryAfter: 60000, // 1 minute
    },
    [Platform.NUVEMSHOP]: {
      platform: Platform.NUVEMSHOP,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000,
      burstLimit: 15,
      retryAfter: 60000, // 1 minute
    },
    [Platform.WOOCOMMERCE]: {
      platform: Platform.WOOCOMMERCE,
      maxRequestsPerMinute: 120,
      maxRequestsPerHour: 2000,
      burstLimit: 25,
      retryAfter: 30000, // 30 seconds
    },
  };

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkRateLimit(
    platform: Platform,
    identifier: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const config = { ...this.defaultConfigs[platform], ...customConfig };
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000); // 1-minute windows
    const hourWindow = Math.floor(now / 3600000); // 1-hour windows

    try {
      // Redis keys for different time windows
      const minuteKey = `rate_limit:${platform}:${identifier}:minute:${minuteWindow}`;
      const hourKey = `rate_limit:${platform}:${identifier}:hour:${hourWindow}`;
      const burstKey = `rate_limit:${platform}:${identifier}:burst`;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Get current counts
      pipeline.get(minuteKey);
      pipeline.get(hourKey);
      pipeline.get(burstKey);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const minuteCount = parseInt(results[0][1] as string || '0');
      const hourCount = parseInt(results[1][1] as string || '0');
      const burstCount = parseInt(results[2][1] as string || '0');

      // Check limits
      const minuteExceeded = minuteCount >= config.maxRequestsPerMinute;
      const hourExceeded = hourCount >= config.maxRequestsPerHour;
      const burstExceeded = burstCount >= config.burstLimit;

      if (minuteExceeded || hourExceeded || burstExceeded) {
        const resetTime = new Date((minuteWindow + 1) * 60000);
        
        this.logger.warn({
          platform,
          identifier,
          minuteCount,
          hourCount,
          burstCount,
          limits: config,
        }, 'Rate limit exceeded');

        return {
          allowed: false,
          remaining: Math.max(0, config.maxRequestsPerMinute - minuteCount),
          resetTime,
          retryAfter: config.retryAfter,
        };
      }

      // Increment counters
      const incrementPipeline = this.redis.pipeline();
      
      incrementPipeline.incr(minuteKey);
      incrementPipeline.expire(minuteKey, 60); // Expire after 1 minute
      
      incrementPipeline.incr(hourKey);
      incrementPipeline.expire(hourKey, 3600); // Expire after 1 hour
      
      incrementPipeline.incr(burstKey);
      incrementPipeline.expire(burstKey, 10); // Burst window of 10 seconds
      
      await incrementPipeline.exec();

      const remaining = Math.max(0, config.maxRequestsPerMinute - minuteCount - 1);
      const resetTime = new Date((minuteWindow + 1) * 60000);

      this.logger.debug({
        platform,
        identifier,
        minuteCount: minuteCount + 1,
        hourCount: hourCount + 1,
        burstCount: burstCount + 1,
        remaining,
      }, 'Rate limit check passed');

      return {
        allowed: true,
        remaining,
        resetTime,
      };

    } catch (error) {
      this.logger.error({
        error,
        platform,
        identifier,
      }, 'Rate limit check failed');

      // Fail open - allow request if rate limiter is down
      return {
        allowed: true,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
      };
    }
  }

  /**
   * Get rate limit status for platform and identifier
   */
  async getRateLimitStatus(
    platform: Platform,
    identifier: string
  ): Promise<{
    minuteCount: number;
    hourCount: number;
    burstCount: number;
    limits: RateLimitConfig;
    resetTimes: {
      minute: Date;
      hour: Date;
      burst: Date;
    };
  }> {
    const config = this.defaultConfigs[platform];
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const hourWindow = Math.floor(now / 3600000);

    try {
      const minuteKey = `rate_limit:${platform}:${identifier}:minute:${minuteWindow}`;
      const hourKey = `rate_limit:${platform}:${identifier}:hour:${hourWindow}`;
      const burstKey = `rate_limit:${platform}:${identifier}:burst`;

      const pipeline = this.redis.pipeline();
      pipeline.get(minuteKey);
      pipeline.get(hourKey);
      pipeline.get(burstKey);
      pipeline.ttl(minuteKey);
      pipeline.ttl(hourKey);
      pipeline.ttl(burstKey);

      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const minuteCount = parseInt(results[0][1] as string || '0');
      const hourCount = parseInt(results[1][1] as string || '0');
      const burstCount = parseInt(results[2][1] as string || '0');
      const minuteTtl = parseInt(results[3][1] as string || '0');
      const hourTtl = parseInt(results[4][1] as string || '0');
      const burstTtl = parseInt(results[5][1] as string || '0');

      return {
        minuteCount,
        hourCount,
        burstCount,
        limits: config,
        resetTimes: {
          minute: new Date(now + minuteTtl * 1000),
          hour: new Date(now + hourTtl * 1000),
          burst: new Date(now + burstTtl * 1000),
        },
      };

    } catch (error) {
      this.logger.error({
        error,
        platform,
        identifier,
      }, 'Failed to get rate limit status');

      return {
        minuteCount: 0,
        hourCount: 0,
        burstCount: 0,
        limits: config,
        resetTimes: {
          minute: new Date(now + 60000),
          hour: new Date(now + 3600000),
          burst: new Date(now + 10000),
        },
      };
    }
  }

  /**
   * Reset rate limits for platform and identifier
   */
  async resetRateLimit(platform: Platform, identifier: string): Promise<void> {
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const hourWindow = Math.floor(now / 3600000);

    try {
      const minuteKey = `rate_limit:${platform}:${identifier}:minute:${minuteWindow}`;
      const hourKey = `rate_limit:${platform}:${identifier}:hour:${hourWindow}`;
      const burstKey = `rate_limit:${platform}:${identifier}:burst`;

      await this.redis.del(minuteKey, hourKey, burstKey);

      this.logger.info({
        platform,
        identifier,
      }, 'Rate limits reset');

    } catch (error) {
      this.logger.error({
        error,
        platform,
        identifier,
      }, 'Failed to reset rate limits');
      throw error;
    }
  }

  /**
   * Update rate limit configuration for platform
   */
  updateConfig(platform: Platform, config: Partial<RateLimitConfig>): void {
    this.defaultConfigs[platform] = { ...this.defaultConfigs[platform], ...config };
    
    this.logger.info({
      platform,
      config: this.defaultConfigs[platform],
    }, 'Rate limit configuration updated');
  }

  /**
   * Get all rate limit configurations
   */
  getConfigurations(): Record<Platform, RateLimitConfig> {
    return { ...this.defaultConfigs };
  }

  /**
   * Get rate limit statistics
   */
  async getStatistics(platform?: Platform): Promise<Record<string, any>> {
    try {
      const patterns = platform 
        ? [`rate_limit:${platform}:*`]
        : Object.values(Platform).map(p => `rate_limit:${p}:*`);

      const stats: Record<string, any> = {};

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        const platformName = pattern.split(':')[1];
        
        if (!stats[platformName]) {
          stats[platformName] = {
            totalKeys: 0,
            minuteKeys: 0,
            hourKeys: 0,
            burstKeys: 0,
          };
        }

        stats[platformName].totalKeys = keys.length;
        stats[platformName].minuteKeys = keys.filter(k => k.includes(':minute:')).length;
        stats[platformName].hourKeys = keys.filter(k => k.includes(':hour:')).length;
        stats[platformName].burstKeys = keys.filter(k => k.includes(':burst')).length;
      }

      return stats;

    } catch (error) {
      this.logger.error({ error, platform }, 'Failed to get rate limit statistics');
      return {};
    }
  }

  /**
   * Clean up expired rate limit keys
   */
  async cleanup(): Promise<{ deletedKeys: number }> {
    try {
      const patterns = Object.values(Platform).map(p => `rate_limit:${p}:*`);
      let deletedKeys = 0;

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        
        // Check TTL for each key and delete expired ones
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) { // Key exists but has no TTL
            await this.redis.del(key);
            deletedKeys++;
          }
        }
      }

      this.logger.info({ deletedKeys }, 'Rate limit cleanup completed');
      return { deletedKeys };

    } catch (error) {
      this.logger.error({ error }, 'Rate limit cleanup failed');
      return { deletedKeys: 0 };
    }
  }

  /**
   * Health check for rate limiter
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redisConnected: boolean;
    error?: string;
  }> {
    try {
      await this.redis.ping();
      return {
        healthy: true,
        redisConnected: true,
      };
    } catch (error) {
      this.logger.error({ error }, 'Rate limiter health check failed');
      return {
        healthy: false,
        redisConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService();

export default RateLimiterService;
