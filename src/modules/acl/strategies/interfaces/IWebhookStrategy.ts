import { 
  BaseWebhookData,
  WebhookValidationResult,
  WebhookProcessingResult,
  HotmartWebhookData,
  NuvemshopWebhookData,
  WooCommerceWebhookData,
  WebhookEventType,
  WebhookEventContext
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext, ValidationResult } from '@/shared/types/platform.types';

/**
 * Base interface for all webhook strategies
 */
export interface IWebhookStrategy {
  /**
   * Platform this strategy handles
   */
  readonly platform: Platform;

  /**
   * Parse platform-specific webhook data into unified format
   */
  parseWebhook(data: any, context: StrategyContext): Promise<BaseWebhookData>;

  /**
   * Validate platform-specific webhook data and signature
   */
  validateWebhook(data: any, signature?: string, secret?: string): WebhookValidationResult;

  /**
   * Extract event type from platform-specific webhook data
   */
  extractEventType(data: any): WebhookEventType | null;

  /**
   * Extract entity information from webhook payload
   */
  extractEntityInfo(data: any): { entityType: string; entityId?: string };

  /**
   * Verify webhook signature/authentication
   */
  verifySignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Get supported event types for this platform
   */
  getSupportedEvents(): WebhookEventType[];

  /**
   * Transform webhook data for processing by entity services
   */
  transformForEntityProcessing(webhookData: BaseWebhookData): any;

  /**
   * Handle platform-specific webhook processing logic
   */
  processWebhookEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult>;
}

/**
 * Hotmart-specific webhook strategy interface
 */
export interface IHotmartWebhookStrategy extends IWebhookStrategy {
  platform: Platform.HOTMART;
  
  /**
   * Parse Hotmart webhook data with HOTTOK authentication
   */
  parseHotmartWebhook(data: any, hottok: string, context: StrategyContext): Promise<HotmartWebhookData>;
  
  /**
   * Validate HOTTOK header authentication
   */
  validateHottok(hottok: string, secret: string): boolean;
  
  /**
   * Map Hotmart event names to unified event types
   */
  mapHotmartEvent(eventName: string): WebhookEventType | null;
  
  /**
   * Process subscription-related events
   */
  processSubscriptionEvent(context: WebhookEventContext, subscriptionData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process purchase-related events
   */
  processPurchaseEvent(context: WebhookEventContext, purchaseData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process commission-related events
   */
  processCommissionEvent(context: WebhookEventContext, commissionData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Extract buyer information from Hotmart webhook
   */
  extractBuyerInfo(data: any): any;
  
  /**
   * Extract producer information from Hotmart webhook
   */
  extractProducerInfo(data: any): any;
  
  /**
   * Extract affiliate information from Hotmart webhook
   */
  extractAffiliateInfo(data: any): any[];
}

/**
 * Nuvemshop-specific webhook strategy interface
 */
export interface INuvemshopWebhookStrategy extends IWebhookStrategy {
  platform: Platform.NUVEMSHOP;
  
  /**
   * Parse Nuvemshop webhook data with HMAC-SHA256 verification
   */
  parseNuvemshopWebhook(data: any, hmacSignature: string, context: StrategyContext): Promise<NuvemshopWebhookData>;
  
  /**
   * Validate HMAC-SHA256 signature
   */
  validateHmacSignature(payload: string, signature: string, secret: string): boolean;
  
  /**
   * Map Nuvemshop event names to unified event types
   */
  mapNuvemshopEvent(eventName: string): WebhookEventType | null;
  
  /**
   * Process order-related events
   */
  processOrderEvent(context: WebhookEventContext, orderData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process product-related events
   */
  processProductEvent(context: WebhookEventContext, productData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process customer-related events
   */
  processCustomerEvent(context: WebhookEventContext, customerData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process category-related events
   */
  processCategoryEvent(context: WebhookEventContext, categoryData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process app lifecycle events (install/uninstall/suspend)
   */
  processAppEvent(context: WebhookEventContext, appData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Handle multi-language data from Nuvemshop
   */
  handleMultiLanguageData(data: any): any;
  
  /**
   * Extract store information from Nuvemshop webhook
   */
  extractStoreInfo(data: any): { storeId: string; storeName?: string };
}

/**
 * WooCommerce-specific webhook strategy interface
 */
export interface IWooCommerceWebhookStrategy extends IWebhookStrategy {
  platform: Platform.WOOCOMMERCE;
  
  /**
   * Parse WooCommerce webhook data with signature verification
   */
  parseWooCommerceWebhook(data: any, signature: string, context: StrategyContext): Promise<WooCommerceWebhookData>;
  
  /**
   * Validate WooCommerce webhook signature
   */
  validateWooCommerceSignature(payload: string, signature: string, secret: string): boolean;
  
  /**
   * Map WooCommerce event names to unified event types
   */
  mapWooCommerceEvent(resource: string, event: string): WebhookEventType | null;
  
  /**
   * Process order-related events
   */
  processOrderEvent(context: WebhookEventContext, orderData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process product-related events
   */
  processProductEvent(context: WebhookEventContext, productData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process customer-related events
   */
  processCustomerEvent(context: WebhookEventContext, customerData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process coupon-related events
   */
  processCouponEvent(context: WebhookEventContext, couponData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process product review events
   */
  processReviewEvent(context: WebhookEventContext, reviewData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Process refund events
   */
  processRefundEvent(context: WebhookEventContext, refundData: any): Promise<WebhookProcessingResult>;
  
  /**
   * Handle WooCommerce product attributes
   */
  handleProductAttributes(productData: any): any;
  
  /**
   * Handle WooCommerce order line items
   */
  handleOrderLineItems(orderData: any): any;
  
  /**
   * Handle WooCommerce tax calculations
   */
  handleTaxCalculations(orderData: any): any;
  
  /**
   * Extract WooCommerce site information
   */
  extractSiteInfo(data: any): { siteUrl?: string; siteName?: string };
}

/**
 * Webhook strategy factory interface
 */
export interface IWebhookStrategyFactory {
  /**
   * Create webhook strategy for platform
   */
  createStrategy(platform: Platform): IWebhookStrategy;
  
  /**
   * Get all available strategies
   */
  getAllStrategies(): Map<Platform, IWebhookStrategy>;
  
  /**
   * Check if platform is supported
   */
  isSupported(platform: Platform): boolean;
}

/**
 * Webhook event processor interface
 */
export interface IWebhookEventProcessor {
  /**
   * Process webhook event for specific entity type
   */
  processEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult>;
  
  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): string[];
  
  /**
   * Validate event data before processing
   */
  validateEventData(entityType: string, payload: Record<string, any>): ValidationResult;
}

/**
 * Real-time sync interface
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
