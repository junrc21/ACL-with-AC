import { Platform } from './platform.types';

/**
 * Webhook event types for different platforms
 */
export enum WebhookEventType {
  // Common events across platforms
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_PAID = 'order.paid',
  ORDER_FULFILLED = 'order.fulfilled',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  
  // Hotmart specific events
  SUBSCRIPTION_CANCELLATION = 'subscription.cancellation',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  PURCHASE_COMPLETED = 'purchase.completed',
  PURCHASE_REFUNDED = 'purchase.refunded',
  COMMISSION_GENERATED = 'commission.generated',
  
  // Nuvemshop specific events
  ORDER_PACKED = 'order.packed',
  APP_UNINSTALLED = 'app.uninstalled',
  APP_SUSPENDED = 'app.suspended',
  APP_RESUMED = 'app.resumed',
  
  // WooCommerce specific events
  COUPON_CREATED = 'coupon.created',
  COUPON_UPDATED = 'coupon.updated',
  COUPON_DELETED = 'coupon.deleted',
  ORDER_REFUNDED = 'order.refunded',
  PRODUCT_REVIEW_CREATED = 'product.review.created',
}

/**
 * Webhook processing status
 */
export enum WebhookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  SKIPPED = 'skipped',
}

/**
 * Base webhook data structure
 */
export interface BaseWebhookData {
  id: string;
  platform: Platform;
  eventType: WebhookEventType;
  eventId?: string;
  payload: Record<string, any>;
  signature?: string;
  timestamp: Date;
  sourceIp?: string;
  userAgent?: string;
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  status: WebhookStatus;
  message?: string;
  error?: string;
  entityId?: string;
  entityType?: string;
  recordsAffected?: number;
  processingTime?: number;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  isAuthentic: boolean;
  errors: string[];
  warnings: string[];
  platform: Platform;
  eventType?: WebhookEventType;
}

/**
 * Platform-specific webhook configurations
 */
export interface WebhookConfig {
  platform: Platform;
  endpoint: string;
  secret: string;
  signatureHeader: string;
  signatureMethod: 'hmac-sha256' | 'hmac-sha1' | 'custom';
  supportedEvents: WebhookEventType[];
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Hotmart webhook data structure
 */
export interface HotmartWebhookData extends BaseWebhookData {
  platform: Platform.HOTMART;
  hottok?: string; // Hotmart authentication token
  payload: {
    id: string;
    event: string;
    version: string;
    data: {
      product?: any;
      buyer?: any;
      producer?: any;
      affiliates?: any[];
      purchase?: any;
      subscription?: any;
      commission?: any;
    };
  };
}

/**
 * Nuvemshop webhook data structure
 */
export interface NuvemshopWebhookData extends BaseWebhookData {
  platform: Platform.NUVEMSHOP;
  hmacSignature?: string; // HMAC-SHA256 signature
  payload: {
    id: number;
    event: string;
    created_at: string;
    store_id: number;
    object_id: number;
    object_type: string;
    data: Record<string, any>;
  };
}

/**
 * WooCommerce webhook data structure
 */
export interface WooCommerceWebhookData extends BaseWebhookData {
  platform: Platform.WOOCOMMERCE;
  signature?: string; // WooCommerce signature
  payload: {
    id: number;
    name: string;
    slug: string;
    resource: string;
    event: string;
    hooks: string[];
    delivery_url: string;
    secret: string;
    date_created: string;
    date_modified: string;
    data: Record<string, any>;
  };
}

/**
 * Union type for all platform webhook data
 */
export type PlatformWebhookData = HotmartWebhookData | NuvemshopWebhookData | WooCommerceWebhookData;

/**
 * Webhook event context for processing
 */
export interface WebhookEventContext {
  webhookId: string;
  platform: Platform;
  eventType: WebhookEventType;
  entityType: string;
  entityId?: string;
  storeId?: string;
  timestamp: Date;
  retryCount: number;
  metadata?: Record<string, any>;
}

/**
 * Sync operation types
 */
export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SYNC = 'sync',
}

/**
 * Sync status types
 */
export enum SyncStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
  SKIPPED = 'skipped',
}

/**
 * Sync log data structure
 */
export interface SyncLogData {
  id?: string;
  platform: Platform;
  entityType: string;
  entityId?: string;
  operation: SyncOperation;
  status: SyncStatus;
  errorMessage?: string;
  recordsAffected: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Event queue item structure
 */
export interface EventQueueItem {
  id: string;
  webhookId: string;
  platform: Platform;
  eventType: WebhookEventType;
  priority: number;
  payload: Record<string, any>;
  context: WebhookEventContext;
  createdAt: Date;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  platform: Platform;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstLimit: number;
  retryAfter: number;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  TIMESTAMP_WINS = 'timestamp_wins',
  PLATFORM_PRIORITY = 'platform_priority',
  MANUAL_REVIEW = 'manual_review',
  MERGE_FIELDS = 'merge_fields',
}

/**
 * Conflict resolution context
 */
export interface ConflictResolutionContext {
  entityType: string;
  entityId: string;
  conflictingData: Array<{
    platform: Platform;
    data: Record<string, any>;
    timestamp: Date;
  }>;
  strategy: ConflictResolutionStrategy;
  metadata?: Record<string, any>;
}
