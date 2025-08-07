import { Webhook, SyncLog } from '@prisma/client';
import { WebhooksRepository } from '../repositories/webhooks.repository';
import { 
  BaseWebhookData,
  WebhookProcessingResult,
  WebhookValidationResult,
  WebhookEventContext,
  WebhookStatus,
  SyncLogData,
  SyncOperation,
  SyncStatus,
  WebhookEventType
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext, PlatformError } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Webhook service for business logic
 */
export class WebhooksService {
  private logger = createPlatformLogger('SERVICE', 'WebhooksService');

  constructor(
    private webhooksRepository: WebhooksRepository = new WebhooksRepository()
  ) {}

  /**
   * Process incoming webhook data
   */
  async processWebhook(
    webhookData: BaseWebhookData,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform: webhookData.platform,
      eventType: webhookData.eventType,
      eventId: webhookData.eventId,
    }, 'Processing webhook data');

    try {
      // Create webhook record
      const webhook = await this.webhooksRepository.create(webhookData);

      // Create webhook event context
      const eventContext: WebhookEventContext = {
        webhookId: webhook.id,
        platform: webhookData.platform,
        eventType: webhookData.eventType,
        entityType: this.extractEntityType(webhookData.eventType),
        entityId: this.extractEntityId(webhookData.payload),
        storeId: context.storeId,
        timestamp: webhookData.timestamp,
        retryCount: 0,
        metadata: context.metadata,
      };

      // Process the webhook event
      const processingResult = await this.processWebhookEvent(eventContext, webhookData.payload);

      // Update webhook status
      await this.webhooksRepository.updateProcessingStatus(
        webhook.id,
        processingResult.success,
        processingResult.error,
        0
      );

      const processingTime = Date.now() - startTime;

      this.logger.info({
        webhookId: webhook.id,
        platform: webhookData.platform,
        eventType: webhookData.eventType,
        success: processingResult.success,
        processingTime,
      }, 'Webhook processed successfully');

      return {
        success: processingResult.success,
        status: processingResult.success ? WebhookStatus.PROCESSED : WebhookStatus.FAILED,
        message: processingResult.message,
        error: processingResult.error,
        entityId: processingResult.entityId,
        entityType: eventContext.entityType,
        recordsAffected: processingResult.recordsAffected,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error({
        error,
        platform: webhookData.platform,
        eventType: webhookData.eventType,
        processingTime,
      }, 'Failed to process webhook');

      if (error instanceof PlatformError) {
        return {
          success: false,
          status: WebhookStatus.FAILED,
          error: error.message,
          processingTime,
        };
      }

      throw error;
    }
  }

  /**
   * Process webhook event based on event type
   */
  private async processWebhookEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    entityId?: string;
    recordsAffected?: number;
  }> {
    const startTime = Date.now();

    // Create sync log entry
    const syncLogData: SyncLogData = {
      platform: context.platform,
      entityType: context.entityType,
      entityId: context.entityId,
      operation: this.mapEventToOperation(context.eventType),
      status: SyncStatus.PENDING,
      recordsAffected: 0,
      startedAt: new Date(),
      metadata: {
        webhookId: context.webhookId,
        eventType: context.eventType,
        ...context.metadata,
      },
    };

    const syncLog = await this.webhooksRepository.createSyncLog(syncLogData);

    try {
      // Process based on entity type
      let result: { success: boolean; entityId?: string; recordsAffected?: number };

      switch (context.entityType) {
        case 'product':
          result = await this.processProductEvent(context, payload);
          break;
        case 'customer':
          result = await this.processCustomerEvent(context, payload);
          break;
        case 'order':
          result = await this.processOrderEvent(context, payload);
          break;
        case 'category':
          result = await this.processCategoryEvent(context, payload);
          break;
        case 'coupon':
          result = await this.processCouponEvent(context, payload);
          break;
        default:
          result = { success: false, recordsAffected: 0 };
          break;
      }

      const duration = Date.now() - startTime;

      // Update sync log
      await this.webhooksRepository.updateSyncLog(
        syncLog.id,
        result.success ? SyncStatus.SUCCESS : SyncStatus.ERROR,
        result.success ? undefined : 'Processing failed',
        result.recordsAffected,
        duration
      );

      return {
        success: result.success,
        message: result.success ? 'Event processed successfully' : 'Event processing failed',
        entityId: result.entityId,
        recordsAffected: result.recordsAffected,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update sync log with error
      await this.webhooksRepository.updateSyncLog(
        syncLog.id,
        SyncStatus.ERROR,
        errorMessage,
        0,
        duration
      );

      return {
        success: false,
        error: errorMessage,
        recordsAffected: 0,
      };
    }
  }

  /**
   * Process product-related webhook events
   */
  private async processProductEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{ success: boolean; entityId?: string; recordsAffected?: number }> {
    // This will be implemented when we integrate with existing product service
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityId: context.entityId,
    }, 'Processing product webhook event');

    // Placeholder implementation
    return {
      success: true,
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process customer-related webhook events
   */
  private async processCustomerEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{ success: boolean; entityId?: string; recordsAffected?: number }> {
    // This will be implemented when we integrate with existing customer service
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityId: context.entityId,
    }, 'Processing customer webhook event');

    // Placeholder implementation
    return {
      success: true,
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process order-related webhook events
   */
  private async processOrderEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{ success: boolean; entityId?: string; recordsAffected?: number }> {
    // This will be implemented when we integrate with existing order service
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityId: context.entityId,
    }, 'Processing order webhook event');

    // Placeholder implementation
    return {
      success: true,
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process category-related webhook events
   */
  private async processCategoryEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{ success: boolean; entityId?: string; recordsAffected?: number }> {
    // This will be implemented when we integrate with existing category service
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityId: context.entityId,
    }, 'Processing category webhook event');

    // Placeholder implementation
    return {
      success: true,
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process coupon-related webhook events
   */
  private async processCouponEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<{ success: boolean; entityId?: string; recordsAffected?: number }> {
    // This will be implemented when we integrate with existing discount service
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityId: context.entityId,
    }, 'Processing coupon webhook event');

    // Placeholder implementation
    return {
      success: true,
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Extract entity type from event type
   */
  private extractEntityType(eventType: WebhookEventType): string {
    const eventTypeStr = eventType.toString();
    
    if (eventTypeStr.startsWith('order.')) return 'order';
    if (eventTypeStr.startsWith('product.')) return 'product';
    if (eventTypeStr.startsWith('customer.')) return 'customer';
    if (eventTypeStr.startsWith('category.')) return 'category';
    if (eventTypeStr.startsWith('coupon.')) return 'coupon';
    if (eventTypeStr.startsWith('subscription.')) return 'subscription';
    if (eventTypeStr.startsWith('purchase.')) return 'purchase';
    if (eventTypeStr.startsWith('commission.')) return 'commission';
    
    return 'unknown';
  }

  /**
   * Extract entity ID from payload
   */
  private extractEntityId(payload: Record<string, any>): string | undefined {
    // Try common ID fields
    return payload.id?.toString() || 
           payload.object_id?.toString() || 
           payload.data?.id?.toString() ||
           undefined;
  }

  /**
   * Map event type to sync operation
   */
  private mapEventToOperation(eventType: WebhookEventType): SyncOperation {
    const eventTypeStr = eventType.toString();
    
    if (eventTypeStr.includes('.created')) return SyncOperation.CREATE;
    if (eventTypeStr.includes('.updated')) return SyncOperation.UPDATE;
    if (eventTypeStr.includes('.deleted')) return SyncOperation.DELETE;
    
    return SyncOperation.SYNC;
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(id: string): Promise<Webhook | null> {
    return this.webhooksRepository.findById(id);
  }

  /**
   * Get webhooks with filters
   */
  async getWebhooks(filters: any): Promise<{ webhooks: Webhook[]; total: number }> {
    return this.webhooksRepository.findMany(filters);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStatistics(filters: any): Promise<any> {
    return this.webhooksRepository.getStatistics(filters);
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks(limit: number = 50): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const unprocessedWebhooks = await this.webhooksRepository.findUnprocessed(limit);
    
    let successful = 0;
    let failed = 0;

    for (const webhook of unprocessedWebhooks) {
      try {
        const webhookData: BaseWebhookData = {
          id: webhook.id,
          platform: webhook.platform as Platform,
          eventType: webhook.eventType as WebhookEventType,
          eventId: webhook.eventId || undefined,
          payload: webhook.payload as Record<string, any>,
          timestamp: webhook.createdAt,
          sourceIp: webhook.sourceIp || undefined,
          userAgent: webhook.userAgent || undefined,
        };

        const context: StrategyContext = {
          platform: webhook.platform as Platform,
          headers: {} as any,
          timestamp: new Date(),
        };

        const result = await this.processWebhook(webhookData, context);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }

      } catch (error) {
        failed++;
        this.logger.error({
          error,
          webhookId: webhook.id,
        }, 'Failed to retry webhook processing');
      }
    }

    this.logger.info({
      processed: unprocessedWebhooks.length,
      successful,
      failed,
    }, 'Webhook retry batch completed');

    return {
      processed: unprocessedWebhooks.length,
      successful,
      failed,
    };
  }
}
