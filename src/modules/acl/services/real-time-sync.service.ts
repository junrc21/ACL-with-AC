import { EventQueueService, EventPriority } from './event-queue.service';
import { eventProcessorFactory } from './event-processors/event-processor-factory';
import { WebhooksService } from './webhooks.service';
import { 
  WebhookEventContext,
  WebhookProcessingResult,
  WebhookEventType,
  ConflictResolutionStrategy,
  SyncOperation,
  SyncStatus
} from '@/shared/types/webhook.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Real-time synchronization service interface
 */
export interface IRealTimeSyncService {
  /**
   * Sync entity data in real-time
   */
  syncEntity(
    platform: Platform,
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<{ success: boolean; message?: string; error?: string }>;
  
  /**
   * Handle sync conflicts
   */
  handleSyncConflict(
    entityType: string,
    entityId: string,
    conflictingData: Array<{ platform: Platform; data: any; timestamp: Date }>
  ): Promise<{ resolved: boolean; resolution?: any }>;
  
  /**
   * Get sync status for entity
   */
  getSyncStatus(entityType: string, entityId: string): Promise<{
    lastSynced: Date;
    platforms: Platform[];
    conflicts: boolean;
  }>;
}

/**
 * Real-time synchronization service implementation
 */
export class RealTimeSyncService implements IRealTimeSyncService {
  private logger = createPlatformLogger('SYNC', 'RealTimeSyncService');
  private eventQueue: EventQueueService;
  private webhooksService: WebhooksService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    eventQueue?: EventQueueService,
    webhooksService?: WebhooksService
  ) {
    this.eventQueue = eventQueue || new EventQueueService();
    this.webhooksService = webhooksService || new WebhooksService();
  }

  /**
   * Start real-time sync processing
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Real-time sync service is already running');
      return;
    }

    this.isProcessing = true;
    this.logger.info('Starting real-time sync service');

    // Start processing events from queue
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueuedEvents();
      } catch (error) {
        this.logger.error({ error }, 'Error processing queued events');
      }
    }, 1000); // Process every second

    // Start cleanup of expired events
    setInterval(async () => {
      try {
        await this.eventQueue.cleanupExpiredEvents();
      } catch (error) {
        this.logger.error({ error }, 'Error cleaning up expired events');
      }
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Stop real-time sync processing
   */
  async stop(): Promise<void> {
    if (!this.isProcessing) {
      this.logger.warn('Real-time sync service is not running');
      return;
    }

    this.isProcessing = false;
    this.logger.info('Stopping real-time sync service');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Sync entity data in real-time
   */
  async syncEntity(
    platform: Platform,
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    this.logger.info({
      platform,
      entityType,
      entityId,
      operation,
    }, 'Starting real-time entity sync');

    try {
      // Create webhook event context
      const context: WebhookEventContext = {
        webhookId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        platform,
        eventType: this.mapOperationToEventType(entityType, operation),
        entityType,
        entityId,
        timestamp: new Date(),
        retryCount: 0,
        metadata: {
          source: 'real-time-sync',
          operation,
        },
      };

      // Determine priority based on operation
      const priority = operation === 'delete' ? EventPriority.HIGH : EventPriority.NORMAL;

      // Add to event queue for processing
      const eventId = await this.eventQueue.enqueue(
        context.webhookId,
        platform,
        context.eventType,
        data,
        context,
        priority
      );

      this.logger.info({
        eventId,
        platform,
        entityType,
        entityId,
        operation,
      }, 'Entity sync event queued successfully');

      return {
        success: true,
        message: `Entity sync queued successfully (Event ID: ${eventId})`,
      };

    } catch (error) {
      this.logger.error({
        error,
        platform,
        entityType,
        entityId,
        operation,
      }, 'Failed to sync entity');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle sync conflicts
   */
  async handleSyncConflict(
    entityType: string,
    entityId: string,
    conflictingData: Array<{ platform: Platform; data: any; timestamp: Date }>
  ): Promise<{ resolved: boolean; resolution?: any }> {
    this.logger.info({
      entityType,
      entityId,
      conflictCount: conflictingData.length,
    }, 'Handling sync conflict');

    try {
      // Sort by timestamp (most recent first)
      const sortedData = conflictingData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply conflict resolution strategy
      const strategy = this.getConflictResolutionStrategy(entityType);
      let resolution: any;

      switch (strategy) {
        case ConflictResolutionStrategy.TIMESTAMP_WINS:
          resolution = this.resolveByTimestamp(sortedData);
          break;
        
        case ConflictResolutionStrategy.PLATFORM_PRIORITY:
          resolution = this.resolveByPlatformPriority(sortedData);
          break;
        
        case ConflictResolutionStrategy.MERGE_FIELDS:
          resolution = this.resolveByMerging(sortedData);
          break;
        
        case ConflictResolutionStrategy.MANUAL_REVIEW:
        default:
          // Log for manual review
          this.logger.warn({
            entityType,
            entityId,
            conflictingData: sortedData,
          }, 'Conflict requires manual review');
          
          return { resolved: false };
      }

      this.logger.info({
        entityType,
        entityId,
        strategy,
        resolution: resolution ? 'resolved' : 'failed',
      }, 'Conflict resolution completed');

      return { resolved: true, resolution };

    } catch (error) {
      this.logger.error({
        error,
        entityType,
        entityId,
      }, 'Failed to resolve sync conflict');

      return { resolved: false };
    }
  }

  /**
   * Get sync status for entity
   */
  async getSyncStatus(entityType: string, entityId: string): Promise<{
    lastSynced: Date;
    platforms: Platform[];
    conflicts: boolean;
  }> {
    // This would typically query the database for sync logs
    // For now, return a placeholder implementation
    return {
      lastSynced: new Date(),
      platforms: [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE],
      conflicts: false,
    };
  }

  /**
   * Process queued events
   */
  private async processQueuedEvents(): Promise<void> {
    try {
      const events = await this.eventQueue.dequeue(5); // Process 5 events at a time
      
      if (events.length === 0) {
        return;
      }

      this.logger.debug({
        eventCount: events.length,
      }, 'Processing queued events');

      // Process events in parallel
      const processingPromises = events.map(event => this.processEvent(event));
      await Promise.allSettled(processingPromises);

    } catch (error) {
      this.logger.error({ error }, 'Failed to process queued events');
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(event: any): Promise<void> {
    try {
      this.logger.debug({
        eventId: event.id,
        platform: event.platform,
        eventType: event.eventType,
      }, 'Processing individual event');

      // Use event processor factory to process the event
      const result = await eventProcessorFactory.processEvent(event.context, event.payload);

      // Mark event as completed or failed
      if (result.success) {
        await this.eventQueue.markCompleted(event.id, result);
      } else {
        await this.eventQueue.markFailed(event.id, result.error || 'Processing failed');
      }

    } catch (error) {
      this.logger.error({
        error,
        eventId: event.id,
      }, 'Failed to process individual event');

      await this.eventQueue.markFailed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Map operation to webhook event type
   */
  private mapOperationToEventType(entityType: string, operation: string): WebhookEventType {
    const eventMap: Record<string, Record<string, WebhookEventType>> = {
      product: {
        create: WebhookEventType.PRODUCT_CREATED,
        update: WebhookEventType.PRODUCT_UPDATED,
        delete: WebhookEventType.PRODUCT_DELETED,
      },
      customer: {
        create: WebhookEventType.CUSTOMER_CREATED,
        update: WebhookEventType.CUSTOMER_UPDATED,
        delete: WebhookEventType.CUSTOMER_DELETED,
      },
      order: {
        create: WebhookEventType.ORDER_CREATED,
        update: WebhookEventType.ORDER_UPDATED,
        delete: WebhookEventType.ORDER_CANCELLED,
      },
      category: {
        create: WebhookEventType.CATEGORY_CREATED,
        update: WebhookEventType.CATEGORY_UPDATED,
        delete: WebhookEventType.CATEGORY_DELETED,
      },
    };

    return eventMap[entityType]?.[operation] || WebhookEventType.ORDER_UPDATED;
  }

  /**
   * Get conflict resolution strategy for entity type
   */
  private getConflictResolutionStrategy(entityType: string): ConflictResolutionStrategy {
    // Define strategies per entity type
    const strategyMap: Record<string, ConflictResolutionStrategy> = {
      product: ConflictResolutionStrategy.TIMESTAMP_WINS,
      customer: ConflictResolutionStrategy.MERGE_FIELDS,
      order: ConflictResolutionStrategy.PLATFORM_PRIORITY,
      category: ConflictResolutionStrategy.TIMESTAMP_WINS,
    };

    return strategyMap[entityType] || ConflictResolutionStrategy.TIMESTAMP_WINS;
  }

  /**
   * Resolve conflict by timestamp (most recent wins)
   */
  private resolveByTimestamp(conflictingData: Array<{ platform: Platform; data: any; timestamp: Date }>): any {
    return conflictingData[0].data; // Already sorted by timestamp
  }

  /**
   * Resolve conflict by platform priority
   */
  private resolveByPlatformPriority(conflictingData: Array<{ platform: Platform; data: any; timestamp: Date }>): any {
    // Define platform priority (higher number = higher priority)
    const platformPriority: Record<Platform, number> = {
      [Platform.WOOCOMMERCE]: 3,
      [Platform.NUVEMSHOP]: 2,
      [Platform.HOTMART]: 1,
    };

    const sortedByPriority = conflictingData.sort((a, b) => 
      platformPriority[b.platform] - platformPriority[a.platform]
    );

    return sortedByPriority[0].data;
  }

  /**
   * Resolve conflict by merging fields
   */
  private resolveByMerging(conflictingData: Array<{ platform: Platform; data: any; timestamp: Date }>): any {
    const merged = {};
    
    // Merge all data, with more recent data overriding older data
    for (const item of conflictingData.reverse()) { // Start with oldest
      Object.assign(merged, item.data);
    }

    return merged;
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    isRunning: boolean;
    queueStats: any;
    processingStats: {
      totalProcessed: number;
      successRate: number;
      averageProcessingTime: number;
    };
  }> {
    const queueStats = await this.eventQueue.getStatistics();
    
    return {
      isRunning: this.isProcessing,
      queueStats,
      processingStats: {
        totalProcessed: queueStats.pending + queueStats.processing + queueStats.failed,
        successRate: queueStats.total > 0 ? (queueStats.total - queueStats.failed) / queueStats.total : 0,
        averageProcessingTime: 0, // Would be calculated from actual metrics
      },
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    details: Record<string, any>;
  }> {
    try {
      const queueStats = await this.eventQueue.getStatistics();
      const isHealthy = this.isProcessing && queueStats.failed < queueStats.total * 0.1; // Less than 10% failure rate

      return {
        healthy: isHealthy,
        status: this.isProcessing ? 'running' : 'stopped',
        details: {
          isProcessing: this.isProcessing,
          queueStats,
          lastCheck: new Date().toISOString(),
        },
      };

    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }
}
