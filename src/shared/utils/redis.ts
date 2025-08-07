import Redis from 'ioredis';
import { config } from '@/config';
import { createPlatformLogger } from './logger';

/**
 * Redis client singleton
 */
class RedisClient {
  private client: Redis | null = null;
  private logger = createPlatformLogger('REDIS', 'Client');

  /**
   * Get Redis client instance
   */
  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(config.redis.url, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });

      this.client.on('connect', () => {
        this.logger.info('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.logger.error({ error }, 'Redis connection error');
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });
    }

    return this.client;
  }

  /**
   * Close Redis connection
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.logger.info('Redis disconnected');
    }
  }

  /**
   * Check Redis connection health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error({ error }, 'Redis health check failed');
      return false;
    }
  }

  /**
   * Get Redis info
   */
  public async getInfo(): Promise<Record<string, any>> {
    try {
      const client = this.getClient();
      const info = await client.info();
      const memory = await client.info('memory');
      const stats = await client.info('stats');
      
      return {
        connected: true,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        memory: memory.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        stats: stats.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get Redis info');
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Export Redis client getter for convenience
export const getRedisClient = () => redisClient.getClient();

export default redisClient;
