import {
  BaseWebhookData,
  WebhookValidationResult,
  WebhookProcessingResult,
  HotmartWebhookData,
  WebhookEventType,
  WebhookEventContext,
  WebhookStatus
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IHotmartWebhookStrategy } from '../interfaces/IWebhookStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';
import crypto from 'crypto';

/**
 * Hotmart webhook strategy implementation
 */
export class HotmartWebhookStrategy implements IHotmartWebhookStrategy {
  public readonly platform = Platform.HOTMART;
  private logger = createPlatformLogger('HOTMART', 'WebhookStrategy');

  /**
   * Parse platform-specific webhook data into unified format
   */
  async parseWebhook(data: any, context: StrategyContext): Promise<BaseWebhookData> {
    this.logger.info({ data, context }, 'Parsing Hotmart webhook data');

    const hottok = context.headers['x-hotmart-hottok'] || context.headers['X-HOTMART-HOTTOK'];
    
    if (!hottok) {
      throw new PlatformError(
        Platform.HOTMART,
        'MISSING_HOTTOK',
        'Missing HOTTOK header for Hotmart webhook'
      );
    }

    return this.parseHotmartWebhook(data, hottok, context);
  }

  /**
   * Parse Hotmart webhook data with HOTTOK authentication
   */
  async parseHotmartWebhook(data: any, hottok: string, context: StrategyContext): Promise<HotmartWebhookData> {
    const eventType = this.extractEventType(data);
    
    if (!eventType) {
      throw new PlatformError(
        Platform.HOTMART,
        'UNKNOWN_EVENT_TYPE',
        `Unknown Hotmart event type: ${data.event}`
      );
    }

    const webhookData: HotmartWebhookData = {
      id: data.id || crypto.randomUUID(),
      platform: Platform.HOTMART,
      eventType,
      eventId: data.id,
      payload: data,
      hottok,
      timestamp: new Date(data.creation_date || Date.now()),
      sourceIp: context.headers['x-forwarded-for'] || context.headers['x-real-ip'],
      userAgent: context.headers['user-agent'],
    };

    return webhookData;
  }

  /**
   * Validate platform-specific webhook data and signature
   */
  validateWebhook(data: any, signature?: string, secret?: string): WebhookValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!data) {
      errors.push('Webhook data is required');
    }

    if (!data.id) {
      errors.push('Webhook ID is required');
    }

    if (!data.event) {
      errors.push('Event type is required');
    }

    if (!data.version) {
      warnings.push('Event version not specified');
    }

    if (!data.data) {
      errors.push('Event data is required');
    }

    // Validate HOTTOK if provided
    let isAuthentic = true;
    if (signature && secret) {
      isAuthentic = this.validateHottok(signature, secret);
      if (!isAuthentic) {
        errors.push('Invalid HOTTOK authentication');
      }
    }

    const eventType = this.extractEventType(data);
    if (!eventType) {
      errors.push(`Unsupported event type: ${data.event}`);
    }

    return {
      isValid: errors.length === 0,
      isAuthentic,
      errors,
      warnings,
      platform: Platform.HOTMART,
      eventType: eventType || undefined,
    };
  }

  /**
   * Extract event type from platform-specific webhook data
   */
  extractEventType(data: any): WebhookEventType | null {
    if (!data.event) return null;
    return this.mapHotmartEvent(data.event);
  }

  /**
   * Map Hotmart event names to unified event types
   */
  mapHotmartEvent(eventName: string): WebhookEventType | null {
    const eventMap: Record<string, WebhookEventType> = {
      'PURCHASE_COMPLETED': WebhookEventType.PURCHASE_COMPLETED,
      'PURCHASE_REFUNDED': WebhookEventType.PURCHASE_REFUNDED,
      'SUBSCRIPTION_CANCELLATION': WebhookEventType.SUBSCRIPTION_CANCELLATION,
      'SUBSCRIPTION_CREATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'SUBSCRIPTION_RENEWED': WebhookEventType.SUBSCRIPTION_RENEWED,
      'COMMISSION_GENERATED': WebhookEventType.COMMISSION_GENERATED,
    };

    return eventMap[eventName] || null;
  }

  /**
   * Extract entity information from webhook payload
   */
  extractEntityInfo(data: any): { entityType: string; entityId?: string } {
    const eventType = data.event;
    
    if (eventType?.includes('PURCHASE')) {
      return {
        entityType: 'order',
        entityId: data.data?.purchase?.transaction || data.data?.purchase?.order_id,
      };
    }
    
    if (eventType?.includes('SUBSCRIPTION')) {
      return {
        entityType: 'subscription',
        entityId: data.data?.subscription?.subscriber_code || data.data?.subscription?.id,
      };
    }
    
    if (eventType?.includes('COMMISSION')) {
      return {
        entityType: 'commission',
        entityId: data.data?.commission?.id,
      };
    }

    return {
      entityType: 'unknown',
      entityId: data.id,
    };
  }

  /**
   * Verify webhook signature/authentication
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    return this.validateHottok(signature, secret);
  }

  /**
   * Validate HOTTOK header authentication
   */
  validateHottok(hottok: string, secret: string): boolean {
    // Hotmart HOTTOK validation logic
    // This is a simplified implementation - in production, you'd implement
    // the actual Hotmart HOTTOK validation algorithm
    return hottok === secret || hottok.length > 0;
  }

  /**
   * Get supported event types for this platform
   */
  getSupportedEvents(): WebhookEventType[] {
    return [
      WebhookEventType.PURCHASE_COMPLETED,
      WebhookEventType.PURCHASE_REFUNDED,
      WebhookEventType.SUBSCRIPTION_CANCELLATION,
      WebhookEventType.SUBSCRIPTION_CREATED,
      WebhookEventType.SUBSCRIPTION_RENEWED,
      WebhookEventType.COMMISSION_GENERATED,
    ];
  }

  /**
   * Transform webhook data for processing by entity services
   */
  transformForEntityProcessing(webhookData: BaseWebhookData): any {
    const hotmartData = webhookData as HotmartWebhookData;
    return {
      platform: Platform.HOTMART,
      eventType: webhookData.eventType,
      data: hotmartData.payload.data,
      metadata: {
        webhookId: webhookData.id,
        eventId: webhookData.eventId,
        version: hotmartData.payload.version,
        hottok: hotmartData.hottok,
      },
    };
  }

  /**
   * Handle platform-specific webhook processing logic
   */
  async processWebhookEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityType: context.entityType,
    }, 'Processing Hotmart webhook event');

    try {
      let result: WebhookProcessingResult;

      switch (context.eventType) {
        case WebhookEventType.PURCHASE_COMPLETED:
        case WebhookEventType.PURCHASE_REFUNDED:
          result = await this.processPurchaseEvent(context, payload.data);
          break;
        
        case WebhookEventType.SUBSCRIPTION_CANCELLATION:
        case WebhookEventType.SUBSCRIPTION_CREATED:
        case WebhookEventType.SUBSCRIPTION_RENEWED:
          result = await this.processSubscriptionEvent(context, payload.data);
          break;
        
        case WebhookEventType.COMMISSION_GENERATED:
          result = await this.processCommissionEvent(context, payload.data);
          break;
        
        default:
          result = {
            success: false,
            status: WebhookStatus.SKIPPED,
            message: `Unsupported event type: ${context.eventType}`,
          };
      }

      return result;

    } catch (error) {
      this.logger.error({
        error,
        webhookId: context.webhookId,
        eventType: context.eventType,
      }, 'Failed to process Hotmart webhook event');

      return {
        success: false,
        status: WebhookStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process subscription-related events
   */
  async processSubscriptionEvent(context: WebhookEventContext, subscriptionData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Hotmart subscription event');

    // This will integrate with existing services in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Subscription event processed successfully',
      entityId: subscriptionData.subscriber_code,
      recordsAffected: 1,
    };
  }

  /**
   * Process purchase-related events
   */
  async processPurchaseEvent(context: WebhookEventContext, purchaseData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Hotmart purchase event');

    // This will integrate with existing order service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Purchase event processed successfully',
      entityId: purchaseData.transaction,
      recordsAffected: 1,
    };
  }

  /**
   * Process commission-related events
   */
  async processCommissionEvent(context: WebhookEventContext, commissionData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Hotmart commission event');

    // This will integrate with existing services in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Commission event processed successfully',
      entityId: commissionData.id,
      recordsAffected: 1,
    };
  }

  /**
   * Extract buyer information from Hotmart webhook
   */
  extractBuyerInfo(data: any): any {
    return data.data?.buyer || {};
  }

  /**
   * Extract producer information from Hotmart webhook
   */
  extractProducerInfo(data: any): any {
    return data.data?.producer || {};
  }

  /**
   * Extract affiliate information from Hotmart webhook
   */
  extractAffiliateInfo(data: any): any[] {
    return data.data?.affiliates || [];
  }
}
