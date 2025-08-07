import { z } from 'zod';
import { Platform } from '@/shared/types/platform.types';
import { 
  WebhookEventType, 
  WebhookStatus, 
  SyncOperation, 
  SyncStatus,
  ConflictResolutionStrategy 
} from '@/shared/types/webhook.types';

/**
 * Base webhook request schema
 */
export const BaseWebhookRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  eventType: z.nativeEnum(WebhookEventType),
  payload: z.record(z.any()),
  signature: z.string().optional(),
  eventId: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

/**
 * Webhook creation request schema
 */
export const CreateWebhookRequestSchema = BaseWebhookRequestSchema.extend({
  sourceIp: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * Webhook processing request schema
 */
export const ProcessWebhookRequestSchema = z.object({
  webhookId: z.string(),
  forceReprocess: z.boolean().default(false),
  skipValidation: z.boolean().default(false),
});

/**
 * Webhook query parameters schema
 */
export const WebhookQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  eventType: z.nativeEnum(WebhookEventType).optional(),
  status: z.nativeEnum(WebhookStatus).optional(),
  processed: z.boolean().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'eventType', 'platform']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Webhook retry request schema
 */
export const WebhookRetryRequestSchema = z.object({
  webhookId: z.string(),
  maxRetries: z.number().min(1).max(10).default(3),
  retryDelay: z.number().min(1000).max(300000).default(5000), // 1s to 5min
});

/**
 * Hotmart webhook payload schema
 */
export const HotmartWebhookPayloadSchema = z.object({
  id: z.string(),
  event: z.string(),
  version: z.string(),
  data: z.object({
    product: z.record(z.any()).optional(),
    buyer: z.record(z.any()).optional(),
    producer: z.record(z.any()).optional(),
    affiliates: z.array(z.record(z.any())).optional(),
    purchase: z.record(z.any()).optional(),
    subscription: z.record(z.any()).optional(),
    commission: z.record(z.any()).optional(),
  }),
});

/**
 * Nuvemshop webhook payload schema
 */
export const NuvemshopWebhookPayloadSchema = z.object({
  id: z.number(),
  event: z.string(),
  created_at: z.string(),
  store_id: z.number(),
  object_id: z.number(),
  object_type: z.string(),
  data: z.record(z.any()),
});

/**
 * WooCommerce webhook payload schema
 */
export const WooCommerceWebhookPayloadSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  resource: z.string(),
  event: z.string(),
  hooks: z.array(z.string()),
  delivery_url: z.string(),
  secret: z.string(),
  date_created: z.string(),
  date_modified: z.string(),
  data: z.record(z.any()),
});

/**
 * Webhook response schema
 */
export const WebhookResponseSchema = z.object({
  id: z.string(),
  platform: z.nativeEnum(Platform),
  eventType: z.nativeEnum(WebhookEventType),
  status: z.nativeEnum(WebhookStatus),
  processed: z.boolean(),
  processedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Sync log creation request schema
 */
export const CreateSyncLogRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  entityType: z.string(),
  entityId: z.string().optional(),
  operation: z.nativeEnum(SyncOperation),
  status: z.nativeEnum(SyncStatus),
  errorMessage: z.string().optional(),
  recordsAffected: z.number().default(0),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Sync log query parameters schema
 */
export const SyncLogQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  entityType: z.string().optional(),
  operation: z.nativeEnum(SyncOperation).optional(),
  status: z.nativeEnum(SyncStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['startedAt', 'completedAt', 'duration', 'platform']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Event queue item schema
 */
export const EventQueueItemSchema = z.object({
  webhookId: z.string(),
  platform: z.nativeEnum(Platform),
  eventType: z.nativeEnum(WebhookEventType),
  priority: z.number().min(1).max(10).default(5),
  payload: z.record(z.any()),
  maxAttempts: z.number().min(1).max(10).default(3),
  scheduledAt: z.coerce.date().optional(),
});

/**
 * Webhook statistics request schema
 */
export const WebhookStatisticsRequestSchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  groupBy: z.enum(['platform', 'eventType', 'status', 'hour', 'day']).default('platform'),
});

/**
 * Conflict resolution request schema
 */
export const ConflictResolutionRequestSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  strategy: z.nativeEnum(ConflictResolutionStrategy),
  conflictingData: z.array(z.object({
    platform: z.nativeEnum(Platform),
    data: z.record(z.any()),
    timestamp: z.coerce.date(),
  })),
  metadata: z.record(z.any()).optional(),
});

/**
 * Rate limit configuration schema
 */
export const RateLimitConfigSchema = z.object({
  platform: z.nativeEnum(Platform),
  maxRequestsPerMinute: z.number().min(1).max(1000).default(60),
  maxRequestsPerHour: z.number().min(1).max(10000).default(1000),
  burstLimit: z.number().min(1).max(100).default(10),
  retryAfter: z.number().min(1000).max(3600000).default(60000), // 1s to 1h
});

/**
 * Webhook management request schemas
 */
export const WebhookRegistrationSchema = z.object({
  platform: z.nativeEnum(Platform),
  endpoint: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEventType)),
  secret: z.string().min(8),
  active: z.boolean().default(true),
});

export const WebhookUpdateSchema = z.object({
  endpoint: z.string().url().optional(),
  events: z.array(z.nativeEnum(WebhookEventType)).optional(),
  secret: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

/**
 * Type definitions for DTOs
 */
export type BaseWebhookRequest = z.infer<typeof BaseWebhookRequestSchema>;
export type CreateWebhookRequest = z.infer<typeof CreateWebhookRequestSchema>;
export type ProcessWebhookRequest = z.infer<typeof ProcessWebhookRequestSchema>;
export type WebhookQuery = z.infer<typeof WebhookQuerySchema>;
export type WebhookRetryRequest = z.infer<typeof WebhookRetryRequestSchema>;
export type HotmartWebhookPayload = z.infer<typeof HotmartWebhookPayloadSchema>;
export type NuvemshopWebhookPayload = z.infer<typeof NuvemshopWebhookPayloadSchema>;
export type WooCommerceWebhookPayload = z.infer<typeof WooCommerceWebhookPayloadSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
export type CreateSyncLogRequest = z.infer<typeof CreateSyncLogRequestSchema>;
export type SyncLogQuery = z.infer<typeof SyncLogQuerySchema>;
export type EventQueueItem = z.infer<typeof EventQueueItemSchema>;
export type WebhookStatisticsRequest = z.infer<typeof WebhookStatisticsRequestSchema>;
export type ConflictResolutionRequest = z.infer<typeof ConflictResolutionRequestSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type WebhookRegistration = z.infer<typeof WebhookRegistrationSchema>;
export type WebhookUpdate = z.infer<typeof WebhookUpdateSchema>;
