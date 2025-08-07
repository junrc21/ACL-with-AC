import {
  BaseWebhookData,
  WebhookValidationResult,
  WebhookProcessingResult,
  NuvemshopWebhookData,
  WebhookEventType,
  WebhookEventContext,
  WebhookStatus
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { INuvemshopWebhookStrategy } from '../interfaces/IWebhookStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';
import crypto from 'crypto';

/**
 * Nuvemshop webhook strategy implementation
 */
export class NuvemshopWebhookStrategy implements INuvemshopWebhookStrategy {
  public readonly platform = Platform.NUVEMSHOP;
  private logger = createPlatformLogger('NUVEMSHOP', 'WebhookStrategy');

  /**
   * Parse platform-specific webhook data into unified format
   */
  async parseWebhook(data: any, context: StrategyContext): Promise<BaseWebhookData> {
    this.logger.info({ data, context }, 'Parsing Nuvemshop webhook data');

    const hmacSignature = context.headers['x-linkedstore-hmac-sha256'] || 
                         context.headers['X-Linkedstore-Hmac-Sha256'];
    
    if (!hmacSignature) {
      throw new PlatformError(
        Platform.NUVEMSHOP,
        'MISSING_HMAC_SIGNATURE',
        'Missing HMAC signature header for Nuvemshop webhook'
      );
    }

    return this.parseNuvemshopWebhook(data, hmacSignature, context);
  }

  /**
   * Parse Nuvemshop webhook data with HMAC-SHA256 verification
   */
  async parseNuvemshopWebhook(data: any, hmacSignature: string, context: StrategyContext): Promise<NuvemshopWebhookData> {
    const eventType = this.extractEventType(data);
    
    if (!eventType) {
      throw new PlatformError(
        Platform.NUVEMSHOP,
        'UNKNOWN_EVENT_TYPE',
        `Unknown Nuvemshop event type: ${data.event}`
      );
    }

    const webhookData: NuvemshopWebhookData = {
      id: data.id?.toString() || crypto.randomUUID(),
      platform: Platform.NUVEMSHOP,
      eventType,
      eventId: data.id?.toString(),
      payload: data,
      hmacSignature,
      timestamp: new Date(data.created_at || Date.now()),
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

    if (!data.store_id) {
      errors.push('Store ID is required');
    }

    if (!data.object_id) {
      warnings.push('Object ID not specified');
    }

    if (!data.object_type) {
      warnings.push('Object type not specified');
    }

    // Validate HMAC signature if provided
    let isAuthentic = true;
    if (signature && secret) {
      isAuthentic = this.validateHmacSignature(JSON.stringify(data), signature, secret);
      if (!isAuthentic) {
        errors.push('Invalid HMAC-SHA256 signature');
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
      platform: Platform.NUVEMSHOP,
      eventType: eventType || undefined,
    };
  }

  /**
   * Extract event type from platform-specific webhook data
   */
  extractEventType(data: any): WebhookEventType | null {
    if (!data.event) return null;
    return this.mapNuvemshopEvent(data.event);
  }

  /**
   * Map Nuvemshop event names to unified event types
   */
  mapNuvemshopEvent(eventName: string): WebhookEventType | null {
    const eventMap: Record<string, WebhookEventType> = {
      'order/created': WebhookEventType.ORDER_CREATED,
      'order/updated': WebhookEventType.ORDER_UPDATED,
      'order/paid': WebhookEventType.ORDER_PAID,
      'order/cancelled': WebhookEventType.ORDER_CANCELLED,
      'order/fulfilled': WebhookEventType.ORDER_FULFILLED,
      'order/packed': WebhookEventType.ORDER_PACKED,
      'order/shipped': WebhookEventType.ORDER_SHIPPED,
      'order/delivered': WebhookEventType.ORDER_DELIVERED,
      'product/created': WebhookEventType.PRODUCT_CREATED,
      'product/updated': WebhookEventType.PRODUCT_UPDATED,
      'product/deleted': WebhookEventType.PRODUCT_DELETED,
      'customer/created': WebhookEventType.CUSTOMER_CREATED,
      'customer/updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer/deleted': WebhookEventType.CUSTOMER_DELETED,
      'category/created': WebhookEventType.CATEGORY_CREATED,
      'category/updated': WebhookEventType.CATEGORY_UPDATED,
      'category/deleted': WebhookEventType.CATEGORY_DELETED,
      'app/uninstalled': WebhookEventType.APP_UNINSTALLED,
      'app/suspended': WebhookEventType.APP_SUSPENDED,
      'app/resumed': WebhookEventType.APP_RESUMED,
    };

    return eventMap[eventName] || null;
  }

  /**
   * Extract entity information from webhook payload
   */
  extractEntityInfo(data: any): { entityType: string; entityId?: string } {
    const eventType = data.event;
    
    if (eventType?.startsWith('order/')) {
      return {
        entityType: 'order',
        entityId: data.object_id?.toString(),
      };
    }
    
    if (eventType?.startsWith('product/')) {
      return {
        entityType: 'product',
        entityId: data.object_id?.toString(),
      };
    }
    
    if (eventType?.startsWith('customer/')) {
      return {
        entityType: 'customer',
        entityId: data.object_id?.toString(),
      };
    }
    
    if (eventType?.startsWith('category/')) {
      return {
        entityType: 'category',
        entityId: data.object_id?.toString(),
      };
    }
    
    if (eventType?.startsWith('app/')) {
      return {
        entityType: 'app',
        entityId: data.store_id?.toString(),
      };
    }

    return {
      entityType: data.object_type || 'unknown',
      entityId: data.object_id?.toString(),
    };
  }

  /**
   * Verify webhook signature/authentication
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    return this.validateHmacSignature(payload, signature, secret);
  }

  /**
   * Validate HMAC-SHA256 signature
   */
  validateHmacSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('base64');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to validate HMAC signature');
      return false;
    }
  }

  /**
   * Get supported event types for this platform
   */
  getSupportedEvents(): WebhookEventType[] {
    return [
      WebhookEventType.ORDER_CREATED,
      WebhookEventType.ORDER_UPDATED,
      WebhookEventType.ORDER_PAID,
      WebhookEventType.ORDER_CANCELLED,
      WebhookEventType.ORDER_FULFILLED,
      WebhookEventType.ORDER_PACKED,
      WebhookEventType.ORDER_SHIPPED,
      WebhookEventType.ORDER_DELIVERED,
      WebhookEventType.PRODUCT_CREATED,
      WebhookEventType.PRODUCT_UPDATED,
      WebhookEventType.PRODUCT_DELETED,
      WebhookEventType.CUSTOMER_CREATED,
      WebhookEventType.CUSTOMER_UPDATED,
      WebhookEventType.CUSTOMER_DELETED,
      WebhookEventType.CATEGORY_CREATED,
      WebhookEventType.CATEGORY_UPDATED,
      WebhookEventType.CATEGORY_DELETED,
      WebhookEventType.APP_UNINSTALLED,
      WebhookEventType.APP_SUSPENDED,
      WebhookEventType.APP_RESUMED,
    ];
  }

  /**
   * Transform webhook data for processing by entity services
   */
  transformForEntityProcessing(webhookData: BaseWebhookData): any {
    const nuvemshopData = webhookData as NuvemshopWebhookData;
    return {
      platform: Platform.NUVEMSHOP,
      eventType: webhookData.eventType,
      storeId: nuvemshopData.payload.store_id?.toString(),
      objectId: nuvemshopData.payload.object_id,
      objectType: nuvemshopData.payload.object_type,
      data: nuvemshopData.payload.data,
      metadata: {
        webhookId: webhookData.id,
        eventId: webhookData.eventId,
        createdAt: nuvemshopData.payload.created_at,
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
    }, 'Processing Nuvemshop webhook event');

    try {
      let result: WebhookProcessingResult;

      switch (context.entityType) {
        case 'order':
          result = await this.processOrderEvent(context, payload);
          break;
        
        case 'product':
          result = await this.processProductEvent(context, payload);
          break;
        
        case 'customer':
          result = await this.processCustomerEvent(context, payload);
          break;
        
        case 'category':
          result = await this.processCategoryEvent(context, payload);
          break;
        
        case 'app':
          result = await this.processAppEvent(context, payload);
          break;
        
        default:
          result = {
            success: false,
            status: WebhookStatus.SKIPPED,
            message: `Unsupported entity type: ${context.entityType}`,
          };
      }

      return result;

    } catch (error) {
      this.logger.error({
        error,
        webhookId: context.webhookId,
        eventType: context.eventType,
      }, 'Failed to process Nuvemshop webhook event');

      return {
        success: false,
        status: WebhookStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process order-related events
   */
  async processOrderEvent(context: WebhookEventContext, orderData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Nuvemshop order event');

    // This will integrate with existing order service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Order event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process product-related events
   */
  async processProductEvent(context: WebhookEventContext, productData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Nuvemshop product event');

    // Handle multi-language data
    const processedData = this.handleMultiLanguageData(productData);

    // This will integrate with existing product service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Product event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process customer-related events
   */
  async processCustomerEvent(context: WebhookEventContext, customerData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Nuvemshop customer event');

    // This will integrate with existing customer service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Customer event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process category-related events
   */
  async processCategoryEvent(context: WebhookEventContext, categoryData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Nuvemshop category event');

    // Handle multi-language data
    const processedData = this.handleMultiLanguageData(categoryData);

    // This will integrate with existing category service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Category event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process app lifecycle events (install/uninstall/suspend)
   */
  async processAppEvent(context: WebhookEventContext, appData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing Nuvemshop app event');

    // Handle app lifecycle events
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'App event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Handle multi-language data from Nuvemshop
   */
  handleMultiLanguageData(data: any): any {
    // Nuvemshop supports multiple languages
    // Extract and normalize multi-language fields
    if (data && typeof data === 'object') {
      const processedData = { ...data };
      
      // Handle common multi-language fields
      const multiLangFields = ['name', 'description', 'seo_title', 'seo_description'];
      
      for (const field of multiLangFields) {
        if (data[field] && typeof data[field] === 'object') {
          // Keep the original multi-language object and add a default value
          processedData[`${field}_multilang`] = data[field];
          processedData[field] = data[field].es || data[field].pt || data[field].en || Object.values(data[field])[0];
        }
      }
      
      return processedData;
    }
    
    return data;
  }

  /**
   * Extract store information from Nuvemshop webhook
   */
  extractStoreInfo(data: any): { storeId: string; storeName?: string } {
    return {
      storeId: data.store_id?.toString(),
      storeName: data.store_name,
    };
  }
}
