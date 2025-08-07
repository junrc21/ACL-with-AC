import { 
  WebhookEventContext, 
  WebhookProcessingResult, 
  WebhookStatus,
  SyncOperation,
  SyncStatus
} from '@/shared/types/webhook.types';
import { Platform, ValidationResult } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Base event processor interface
 */
export interface IEventProcessor {
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
  
  /**
   * Get processor name
   */
  getProcessorName(): string;
}

/**
 * Base event processor implementation
 */
export abstract class BaseEventProcessor implements IEventProcessor {
  protected logger = createPlatformLogger('EVENT_PROCESSOR', this.getProcessorName());

  /**
   * Process webhook event for specific entity type
   */
  abstract processEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult>;
  
  /**
   * Get supported entity types
   */
  abstract getSupportedEntityTypes(): string[];
  
  /**
   * Get processor name
   */
  abstract getProcessorName(): string;

  /**
   * Validate event data before processing
   */
  validateEventData(entityType: string, payload: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!payload) {
      errors.push('Payload is required');
    }

    if (!entityType) {
      errors.push('Entity type is required');
    }

    // Check if entity type is supported
    if (!this.getSupportedEntityTypes().includes(entityType)) {
      errors.push(`Unsupported entity type: ${entityType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult(
    entityId?: string,
    recordsAffected: number = 1,
    message?: string
  ): WebhookProcessingResult {
    return {
      success: true,
      status: WebhookStatus.PROCESSED,
      message: message || 'Event processed successfully',
      entityId,
      recordsAffected,
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(
    error: string,
    entityId?: string
  ): WebhookProcessingResult {
    return {
      success: false,
      status: WebhookStatus.FAILED,
      error,
      entityId,
      recordsAffected: 0,
    };
  }

  /**
   * Create skipped result
   */
  protected createSkippedResult(
    message: string,
    entityId?: string
  ): WebhookProcessingResult {
    return {
      success: true,
      status: WebhookStatus.SKIPPED,
      message,
      entityId,
      recordsAffected: 0,
    };
  }

  /**
   * Extract entity ID from payload based on platform
   */
  protected extractEntityId(payload: Record<string, any>, platform: Platform): string | undefined {
    // Try common ID fields based on platform
    switch (platform) {
      case Platform.HOTMART:
        return payload.data?.product?.id?.toString() ||
               payload.data?.purchase?.transaction ||
               payload.data?.subscription?.subscriber_code ||
               payload.id?.toString();
      
      case Platform.NUVEMSHOP:
        return payload.object_id?.toString() ||
               payload.data?.id?.toString() ||
               payload.id?.toString();
      
      case Platform.WOOCOMMERCE:
        return payload.data?.id?.toString() ||
               payload.id?.toString();
      
      default:
        return payload.id?.toString() ||
               payload.data?.id?.toString();
    }
  }

  /**
   * Map event type to sync operation
   */
  protected mapEventToOperation(eventType: string): SyncOperation {
    const eventTypeStr = eventType.toLowerCase();
    
    if (eventTypeStr.includes('created')) return SyncOperation.CREATE;
    if (eventTypeStr.includes('updated')) return SyncOperation.UPDATE;
    if (eventTypeStr.includes('deleted')) return SyncOperation.DELETE;
    
    return SyncOperation.SYNC;
  }

  /**
   * Handle processing errors with proper logging
   */
  protected handleProcessingError(
    error: unknown,
    context: WebhookEventContext,
    entityId?: string
  ): WebhookProcessingResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    this.logger.error({
      error,
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityType: context.entityType,
      entityId,
    }, 'Event processing failed');

    return this.createErrorResult(errorMessage, entityId);
  }

  /**
   * Log processing start
   */
  protected logProcessingStart(context: WebhookEventContext, entityId?: string): void {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityType: context.entityType,
      entityId,
      platform: context.platform,
    }, `Starting ${context.entityType} event processing`);
  }

  /**
   * Log processing completion
   */
  protected logProcessingComplete(
    context: WebhookEventContext,
    result: WebhookProcessingResult,
    processingTime?: number
  ): void {
    this.logger.info({
      webhookId: context.webhookId,
      eventType: context.eventType,
      entityType: context.entityType,
      entityId: result.entityId,
      success: result.success,
      status: result.status,
      recordsAffected: result.recordsAffected,
      processingTime,
    }, `Completed ${context.entityType} event processing`);
  }

  /**
   * Validate required fields in payload
   */
  protected validateRequiredFields(
    payload: Record<string, any>,
    requiredFields: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of requiredFields) {
      const fieldPath = field.split('.');
      let value = payload;
      
      for (const path of fieldPath) {
        value = value?.[path];
      }
      
      if (value === undefined || value === null) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if event should be processed based on conditions
   */
  protected shouldProcessEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): { shouldProcess: boolean; reason?: string } {
    // Override in subclasses for specific logic
    return { shouldProcess: true };
  }

  /**
   * Transform payload for service consumption
   */
  protected transformPayload(
    payload: Record<string, any>,
    platform: Platform
  ): Record<string, any> {
    // Base implementation - override in subclasses for specific transformations
    return payload;
  }

  /**
   * Get processing metrics
   */
  protected getProcessingMetrics(): Record<string, any> {
    return {
      processorName: this.getProcessorName(),
      supportedEntityTypes: this.getSupportedEntityTypes(),
      timestamp: new Date().toISOString(),
    };
  }
}
