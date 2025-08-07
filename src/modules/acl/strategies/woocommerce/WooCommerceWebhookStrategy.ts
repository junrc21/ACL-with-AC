import {
  BaseWebhookData,
  WebhookValidationResult,
  WebhookProcessingResult,
  WooCommerceWebhookData,
  WebhookEventType,
  WebhookEventContext,
  WebhookStatus
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IWooCommerceWebhookStrategy } from '../interfaces/IWebhookStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';
import crypto from 'crypto';

/**
 * WooCommerce webhook strategy implementation
 */
export class WooCommerceWebhookStrategy implements IWooCommerceWebhookStrategy {
  public readonly platform = Platform.WOOCOMMERCE;
  private logger = createPlatformLogger('WOOCOMMERCE', 'WebhookStrategy');

  /**
   * Parse platform-specific webhook data into unified format
   */
  async parseWebhook(data: any, context: StrategyContext): Promise<BaseWebhookData> {
    this.logger.info({ data, context }, 'Parsing WooCommerce webhook data');

    const signature = context.headers['x-wc-webhook-signature'] || 
                     context.headers['X-WC-Webhook-Signature'];
    
    return this.parseWooCommerceWebhook(data, signature || '', context);
  }

  /**
   * Parse WooCommerce webhook data with signature verification
   */
  async parseWooCommerceWebhook(data: any, signature: string, context: StrategyContext): Promise<WooCommerceWebhookData> {
    const eventType = this.extractEventType(data);
    
    if (!eventType) {
      throw new PlatformError(
        Platform.WOOCOMMERCE,
        'UNKNOWN_EVENT_TYPE',
        `Unknown WooCommerce event type: ${data.resource}.${data.event}`
      );
    }

    const webhookData: WooCommerceWebhookData = {
      id: data.id?.toString() || crypto.randomUUID(),
      platform: Platform.WOOCOMMERCE,
      eventType,
      eventId: data.id?.toString(),
      payload: data,
      signature,
      timestamp: new Date(data.date_modified || data.date_created || Date.now()),
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

    if (!data.resource) {
      errors.push('Resource type is required');
    }

    if (!data.event) {
      errors.push('Event type is required');
    }

    // Validate signature if provided
    let isAuthentic = true;
    if (signature && secret) {
      isAuthentic = this.validateWooCommerceSignature(JSON.stringify(data), signature, secret);
      if (!isAuthentic) {
        errors.push('Invalid WooCommerce webhook signature');
      }
    } else if (signature) {
      warnings.push('Webhook signature provided but no secret configured');
    }

    const eventType = this.extractEventType(data);
    if (!eventType) {
      errors.push(`Unsupported event type: ${data.resource}.${data.event}`);
    }

    return {
      isValid: errors.length === 0,
      isAuthentic,
      errors,
      warnings,
      platform: Platform.WOOCOMMERCE,
      eventType: eventType || undefined,
    };
  }

  /**
   * Extract event type from platform-specific webhook data
   */
  extractEventType(data: any): WebhookEventType | null {
    if (!data.resource || !data.event) return null;
    return this.mapWooCommerceEvent(data.resource, data.event);
  }

  /**
   * Map WooCommerce event names to unified event types
   */
  mapWooCommerceEvent(resource: string, event: string): WebhookEventType | null {
    const eventKey = `${resource}.${event}`;
    
    const eventMap: Record<string, WebhookEventType> = {
      'order.created': WebhookEventType.ORDER_CREATED,
      'order.updated': WebhookEventType.ORDER_UPDATED,
      'order.deleted': WebhookEventType.ORDER_CANCELLED,
      'order.restored': WebhookEventType.ORDER_UPDATED,
      'product.created': WebhookEventType.PRODUCT_CREATED,
      'product.updated': WebhookEventType.PRODUCT_UPDATED,
      'product.deleted': WebhookEventType.PRODUCT_DELETED,
      'product.restored': WebhookEventType.PRODUCT_UPDATED,
      'customer.created': WebhookEventType.CUSTOMER_CREATED,
      'customer.updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer.deleted': WebhookEventType.CUSTOMER_DELETED,
      'coupon.created': WebhookEventType.COUPON_CREATED,
      'coupon.updated': WebhookEventType.COUPON_UPDATED,
      'coupon.deleted': WebhookEventType.COUPON_DELETED,
      'order.refunded': WebhookEventType.ORDER_REFUNDED,
    };

    return eventMap[eventKey] || null;
  }

  /**
   * Extract entity information from webhook payload
   */
  extractEntityInfo(data: any): { entityType: string; entityId?: string } {
    const resource = data.resource;
    
    return {
      entityType: resource || 'unknown',
      entityId: data.id?.toString(),
    };
  }

  /**
   * Verify webhook signature/authentication
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    return this.validateWooCommerceSignature(payload, signature, secret);
  }

  /**
   * Validate WooCommerce webhook signature
   */
  validateWooCommerceSignature(payload: string, signature: string, secret: string): boolean {
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
      this.logger.error({ error }, 'Failed to validate WooCommerce signature');
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
      WebhookEventType.ORDER_CANCELLED,
      WebhookEventType.ORDER_REFUNDED,
      WebhookEventType.PRODUCT_CREATED,
      WebhookEventType.PRODUCT_UPDATED,
      WebhookEventType.PRODUCT_DELETED,
      WebhookEventType.CUSTOMER_CREATED,
      WebhookEventType.CUSTOMER_UPDATED,
      WebhookEventType.CUSTOMER_DELETED,
      WebhookEventType.COUPON_CREATED,
      WebhookEventType.COUPON_UPDATED,
      WebhookEventType.COUPON_DELETED,
      WebhookEventType.PRODUCT_REVIEW_CREATED,
    ];
  }

  /**
   * Transform webhook data for processing by entity services
   */
  transformForEntityProcessing(webhookData: BaseWebhookData): any {
    const wooCommerceData = webhookData as WooCommerceWebhookData;
    return {
      platform: Platform.WOOCOMMERCE,
      eventType: webhookData.eventType,
      resource: wooCommerceData.payload.resource,
      event: wooCommerceData.payload.event,
      data: wooCommerceData.payload.data,
      metadata: {
        webhookId: webhookData.id,
        eventId: webhookData.eventId,
        deliveryUrl: wooCommerceData.payload.delivery_url,
        dateCreated: wooCommerceData.payload.date_created,
        dateModified: wooCommerceData.payload.date_modified,
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
    }, 'Processing WooCommerce webhook event');

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
        
        case 'coupon':
          result = await this.processCouponEvent(context, payload);
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
      }, 'Failed to process WooCommerce webhook event');

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
    }, 'Processing WooCommerce order event');

    // Handle order line items
    const processedData = this.handleOrderLineItems(orderData);
    
    // Handle tax calculations
    const dataWithTax = this.handleTaxCalculations(processedData);

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
    }, 'Processing WooCommerce product event');

    // Handle product attributes
    const processedData = this.handleProductAttributes(productData);

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
    }, 'Processing WooCommerce customer event');

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
   * Process coupon-related events
   */
  async processCouponEvent(context: WebhookEventContext, couponData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing WooCommerce coupon event');

    // This will integrate with existing discount service in later tasks
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Coupon event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process product review events
   */
  async processReviewEvent(context: WebhookEventContext, reviewData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing WooCommerce review event');

    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Review event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Process refund events
   */
  async processRefundEvent(context: WebhookEventContext, refundData: any): Promise<WebhookProcessingResult> {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
    }, 'Processing WooCommerce refund event');

    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: 'Refund event processed successfully',
      entityId: context.entityId,
      recordsAffected: 1,
    };
  }

  /**
   * Handle WooCommerce product attributes
   */
  handleProductAttributes(productData: any): any {
    if (productData && productData.attributes) {
      const processedData = { ...productData };
      
      // Normalize attributes structure
      processedData.normalized_attributes = productData.attributes.map((attr: any) => ({
        id: attr.id,
        name: attr.name,
        slug: attr.slug,
        options: attr.options,
        visible: attr.visible,
        variation: attr.variation,
      }));
      
      return processedData;
    }
    
    return productData;
  }

  /**
   * Handle WooCommerce order line items
   */
  handleOrderLineItems(orderData: any): any {
    if (orderData && orderData.line_items) {
      const processedData = { ...orderData };
      
      // Normalize line items structure
      processedData.normalized_line_items = orderData.line_items.map((item: any) => ({
        id: item.id,
        name: item.name,
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        subtotal: item.subtotal,
        tax_total: item.total_tax,
        sku: item.sku,
        meta_data: item.meta_data,
      }));
      
      return processedData;
    }
    
    return orderData;
  }

  /**
   * Handle WooCommerce tax calculations
   */
  handleTaxCalculations(orderData: any): any {
    if (orderData && orderData.tax_lines) {
      const processedData = { ...orderData };
      
      // Calculate total tax
      processedData.total_tax_amount = orderData.tax_lines.reduce((total: number, taxLine: any) => {
        return total + parseFloat(taxLine.tax_total || 0);
      }, 0);
      
      // Normalize tax lines
      processedData.normalized_tax_lines = orderData.tax_lines.map((taxLine: any) => ({
        id: taxLine.id,
        rate_code: taxLine.rate_code,
        rate_id: taxLine.rate_id,
        label: taxLine.label,
        compound: taxLine.compound,
        tax_total: taxLine.tax_total,
        shipping_tax_total: taxLine.shipping_tax_total,
      }));
      
      return processedData;
    }
    
    return orderData;
  }

  /**
   * Extract WooCommerce site information
   */
  extractSiteInfo(data: any): { siteUrl?: string; siteName?: string } {
    return {
      siteUrl: data._links?.self?.[0]?.href?.split('/wp-json')[0],
      siteName: data.site_name,
    };
  }
}
