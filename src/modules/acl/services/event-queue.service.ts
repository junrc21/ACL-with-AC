import { Redis } from 'ioredis';
import { getRedisClient } from '@/shared/utils/redis';
import { 
  EventQueueItem, 
  WebhookEventContext, 
  WebhookEventType,
  WebhookProcessingResult,
  WebhookStatus
} from '@/shared/types/webhook.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';
import crypto from 'crypto';

/**
 * Event queue priorities
 */
export enum EventPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  processingTimeout: number;
  batchSize: number;
}

/**
 * Event queue management service using Redis
 */
export class EventQueueService {
  private redis: Redis;
  private logger = createPlatformLogger('QUEUE', 'EventQueueService');
  
  // Queue names
  private readonly WEBHOOK_QUEUE = 'webhook:events';
  private readonly PROCESSING_QUEUE = 'webhook:processing';
  private readonly FAILED_QUEUE = 'webhook:failed';
  private readonly DELAYED_QUEUE = 'webhook:delayed';
  
  // Default configuration
  private readonly defaultConfig: QueueConfig = {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    processingTimeout: 30000, // 30 seconds
    batchSize: 10,
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.redis = getRedisClient();
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Add event to queue
   */
  async enqueue(
    webhookId: string,
    platform: Platform,
    eventType: WebhookEventType,
    payload: Record<string, any>,
    context: WebhookEventContext,
    priority: EventPriority = EventPriority.NORMAL,
    scheduledAt?: Date
  ): Promise<string> {
    const eventId = crypto.randomUUID();
    
    const queueItem: EventQueueItem = {
      id: eventId,
      webhookId,
      platform,
      eventType,
      priority,
      payload,
      context,
      createdAt: new Date(),
      scheduledAt,
      attempts: 0,
      maxAttempts: this.defaultConfig.maxRetries,
      lastError: undefined,
    };

    try {
      const queueName = scheduledAt ? this.DELAYED_QUEUE : this.WEBHOOK_QUEUE;
      const score = scheduledAt ? scheduledAt.getTime() : Date.now() - priority * 1000; // Higher priority = lower score
      
      // Add to sorted set for priority/scheduling
      await this.redis.zadd(queueName, score, JSON.stringify(queueItem));
      
      this.logger.info({
        eventId,
        webhookId,
        platform,
        eventType,
        priority,
        scheduledAt,
        queueName,
      }, 'Event added to queue');

      return eventId;

    } catch (error) {
      this.logger.error({
        error,
        eventId,
        webhookId,
        platform,
        eventType,
      }, 'Failed to enqueue event');
      throw error;
    }
  }

  /**
   * Dequeue events for processing
   */
  async dequeue(batchSize: number = this.defaultConfig.batchSize): Promise<EventQueueItem[]> {
    try {
      // First, move any ready delayed events to main queue
      await this.moveDelayedEvents();

      // Get events from main queue (lowest score first = highest priority first)
      const results = await this.redis.zpopmin(this.WEBHOOK_QUEUE, batchSize);
      
      if (!results || results.length === 0) {
        return [];
      }

      const events: EventQueueItem[] = [];
      
      // Process results in pairs (value, score)
      for (let i = 0; i < results.length; i += 2) {
        try {
          const eventData = JSON.parse(results[i]);
          events.push(eventData);
          
          // Move to processing queue
          await this.redis.zadd(
            this.PROCESSING_QUEUE, 
            Date.now() + this.defaultConfig.processingTimeout,
            results[i]
          );
          
        } catch (parseError) {
          this.logger.error({
            error: parseError,
            eventData: results[i],
          }, 'Failed to parse event data');
        }
      }

      this.logger.debug({
        count: events.length,
        batchSize,
      }, 'Events dequeued for processing');

      return events;

    } catch (error) {
      this.logger.error({ error, batchSize }, 'Failed to dequeue events');
      throw error;
    }
  }

  /**
   * Mark event as completed
   */
  async markCompleted(eventId: string, result: WebhookProcessingResult): Promise<void> {
    try {
      // Remove from processing queue
      const removed = await this.removeFromProcessingQueue(eventId);
      
      if (removed) {
        this.logger.info({
          eventId,
          success: result.success,
          status: result.status,
          processingTime: result.processingTime,
        }, 'Event marked as completed');
      }

    } catch (error) {
      this.logger.error({
        error,
        eventId,
        result,
      }, 'Failed to mark event as completed');
      throw error;
    }
  }

  /**
   * Mark event as failed and handle retry logic
   */
  async markFailed(
    eventId: string, 
    error: string, 
    shouldRetry: boolean = true
  ): Promise<void> {
    try {
      // Find and remove from processing queue
      const eventData = await this.removeFromProcessingQueue(eventId);
      
      if (!eventData) {
        this.logger.warn({ eventId }, 'Event not found in processing queue');
        return;
      }

      const event: EventQueueItem = JSON.parse(eventData);
      event.attempts++;
      event.lastError = error;

      if (shouldRetry && event.attempts < event.maxAttempts) {
        // Calculate exponential backoff delay
        const delay = this.defaultConfig.retryDelay * Math.pow(2, event.attempts - 1);
        const retryAt = new Date(Date.now() + delay);
        
        // Add back to delayed queue for retry
        await this.redis.zadd(
          this.DELAYED_QUEUE,
          retryAt.getTime(),
          JSON.stringify(event)
        );

        this.logger.info({
          eventId,
          attempts: event.attempts,
          maxAttempts: event.maxAttempts,
          retryAt,
          delay,
        }, 'Event scheduled for retry');

      } else {
        // Move to failed queue
        await this.redis.zadd(
          this.FAILED_QUEUE,
          Date.now(),
          JSON.stringify(event)
        );

        this.logger.error({
          eventId,
          attempts: event.attempts,
          maxAttempts: event.maxAttempts,
          error,
        }, 'Event moved to failed queue');
      }

    } catch (err) {
      this.logger.error({
        error: err,
        eventId,
        originalError: error,
      }, 'Failed to mark event as failed');
      throw err;
    }
  }

  /**
   * Get queue statistics
   */
  async getStatistics(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    delayed: number;
    total: number;
  }> {
    try {
      const [pending, processing, failed, delayed] = await Promise.all([
        this.redis.zcard(this.WEBHOOK_QUEUE),
        this.redis.zcard(this.PROCESSING_QUEUE),
        this.redis.zcard(this.FAILED_QUEUE),
        this.redis.zcard(this.DELAYED_QUEUE),
      ]);

      const total = pending + processing + failed + delayed;

      return {
        pending,
        processing,
        failed,
        delayed,
        total,
      };

    } catch (error) {
      this.logger.error({ error }, 'Failed to get queue statistics');
      throw error;
    }
  }

  /**
   * Clean up expired processing events
   */
  async cleanupExpiredEvents(): Promise<number> {
    try {
      const now = Date.now();
      
      // Get expired events from processing queue
      const expiredEvents = await this.redis.zrangebyscore(
        this.PROCESSING_QUEUE,
        '-inf',
        now,
        'WITHSCORES'
      );

      if (expiredEvents.length === 0) {
        return 0;
      }

      let cleanedCount = 0;

      // Process expired events in pairs (value, score)
      for (let i = 0; i < expiredEvents.length; i += 2) {
        try {
          const eventData = expiredEvents[i];
          const event: EventQueueItem = JSON.parse(eventData);
          
          // Remove from processing queue
          await this.redis.zrem(this.PROCESSING_QUEUE, eventData);
          
          // Mark as failed for retry
          await this.markFailed(event.id, 'Processing timeout', true);
          
          cleanedCount++;

        } catch (parseError) {
          this.logger.error({
            error: parseError,
            eventData: expiredEvents[i],
          }, 'Failed to process expired event');
        }
      }

      this.logger.info({
        cleanedCount,
        totalExpired: expiredEvents.length / 2,
      }, 'Cleaned up expired processing events');

      return cleanedCount;

    } catch (error) {
      this.logger.error({ error }, 'Failed to cleanup expired events');
      throw error;
    }
  }

  /**
   * Move delayed events that are ready to main queue
   */
  private async moveDelayedEvents(): Promise<number> {
    try {
      const now = Date.now();
      
      // Get ready delayed events
      const readyEvents = await this.redis.zrangebyscore(
        this.DELAYED_QUEUE,
        '-inf',
        now,
        'WITHSCORES'
      );

      if (readyEvents.length === 0) {
        return 0;
      }

      let movedCount = 0;

      // Process events in pairs (value, score)
      for (let i = 0; i < readyEvents.length; i += 2) {
        try {
          const eventData = readyEvents[i];
          const event: EventQueueItem = JSON.parse(eventData);
          
          // Remove from delayed queue
          await this.redis.zrem(this.DELAYED_QUEUE, eventData);
          
          // Add to main queue with priority-based score
          const score = Date.now() - event.priority * 1000;
          await this.redis.zadd(this.WEBHOOK_QUEUE, score, eventData);
          
          movedCount++;

        } catch (parseError) {
          this.logger.error({
            error: parseError,
            eventData: readyEvents[i],
          }, 'Failed to move delayed event');
        }
      }

      if (movedCount > 0) {
        this.logger.debug({
          movedCount,
          totalReady: readyEvents.length / 2,
        }, 'Moved delayed events to main queue');
      }

      return movedCount;

    } catch (error) {
      this.logger.error({ error }, 'Failed to move delayed events');
      return 0;
    }
  }

  /**
   * Remove event from processing queue
   */
  private async removeFromProcessingQueue(eventId: string): Promise<string | null> {
    try {
      // Get all processing events
      const processingEvents = await this.redis.zrange(this.PROCESSING_QUEUE, 0, -1);
      
      for (const eventData of processingEvents) {
        try {
          const event: EventQueueItem = JSON.parse(eventData);
          if (event.id === eventId) {
            await this.redis.zrem(this.PROCESSING_QUEUE, eventData);
            return eventData;
          }
        } catch (parseError) {
          this.logger.error({
            error: parseError,
            eventData,
          }, 'Failed to parse processing event');
        }
      }

      return null;

    } catch (error) {
      this.logger.error({
        error,
        eventId,
      }, 'Failed to remove from processing queue');
      throw error;
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  async clearAllQueues(): Promise<void> {
    try {
      await Promise.all([
        this.redis.del(this.WEBHOOK_QUEUE),
        this.redis.del(this.PROCESSING_QUEUE),
        this.redis.del(this.FAILED_QUEUE),
        this.redis.del(this.DELAYED_QUEUE),
      ]);

      this.logger.warn('All event queues cleared');

    } catch (error) {
      this.logger.error({ error }, 'Failed to clear queues');
      throw error;
    }
  }

  /**
   * Get failed events for manual inspection
   */
  async getFailedEvents(limit: number = 100): Promise<EventQueueItem[]> {
    try {
      const failedEventData = await this.redis.zrange(this.FAILED_QUEUE, 0, limit - 1);
      
      const failedEvents: EventQueueItem[] = [];
      
      for (const eventData of failedEventData) {
        try {
          const event: EventQueueItem = JSON.parse(eventData);
          failedEvents.push(event);
        } catch (parseError) {
          this.logger.error({
            error: parseError,
            eventData,
          }, 'Failed to parse failed event');
        }
      }

      return failedEvents;

    } catch (error) {
      this.logger.error({ error, limit }, 'Failed to get failed events');
      throw error;
    }
  }
}
