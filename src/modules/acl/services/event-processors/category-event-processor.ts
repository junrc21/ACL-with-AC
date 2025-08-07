import { BaseEventProcessor } from './base-event-processor';
import { CategoriesService } from '../categories.service';
import { 
  WebhookEventContext, 
  WebhookProcessingResult,
  WebhookEventType
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext } from '@/shared/types/platform.types';

/**
 * Category event processor for handling category-related webhook events
 */
export class CategoryEventProcessor extends BaseEventProcessor {
  private categoriesService: CategoriesService;

  constructor(categoriesService?: CategoriesService) {
    super();
    this.categoriesService = categoriesService || new CategoriesService();
  }

  /**
   * Get processor name
   */
  getProcessorName(): string {
    return 'CategoryEventProcessor';
  }

  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): string[] {
    return ['category'];
  }

  /**
   * Process category webhook event
   */
  async processEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const entityId = this.extractEntityId(payload, context.platform);
    
    this.logProcessingStart(context, entityId);

    try {
      // Skip if platform doesn't support categories
      if (context.platform === Platform.HOTMART) {
        return this.createSkippedResult(
          'Hotmart does not support categories',
          entityId
        );
      }

      // Validate event data
      const validation = this.validateEventData(context.entityType, payload);
      if (!validation.isValid) {
        return this.createErrorResult(
          `Validation failed: ${validation.errors.join(', ')}`,
          entityId
        );
      }

      // Check if event should be processed
      const shouldProcess = this.shouldProcessEvent(context, payload);
      if (!shouldProcess.shouldProcess) {
        return this.createSkippedResult(
          shouldProcess.reason || 'Event skipped',
          entityId
        );
      }

      // Transform payload for service consumption
      const transformedPayload = this.transformPayload(payload, context.platform);

      // Create strategy context
      const strategyContext: StrategyContext = {
        platform: context.platform,
        storeId: context.storeId,
        headers: {} as any,
        timestamp: new Date(),
        metadata: context.metadata,
      };

      let result;

      // Process based on event type
      switch (context.eventType) {
        case WebhookEventType.CATEGORY_CREATED:
          result = await this.handleCategoryCreated(transformedPayload, strategyContext);
          break;
        
        case WebhookEventType.CATEGORY_UPDATED:
          result = await this.handleCategoryUpdated(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.CATEGORY_DELETED:
          result = await this.handleCategoryDeleted(entityId, strategyContext);
          break;
        
        default:
          return this.createSkippedResult(
            `Unsupported category event type: ${context.eventType}`,
            entityId
          );
      }

      const processingTime = Date.now() - startTime;
      this.logProcessingComplete(context, result, processingTime);

      return result;

    } catch (error) {
      return this.handleProcessingError(error, context, entityId);
    }
  }

  /**
   * Handle category created event
   */
  private async handleCategoryCreated(
    payload: Record<string, any>,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    try {
      const result = await this.categoriesService.processCategory(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.categoryId,
          1,
          'Category created successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to create category',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle category updated event
   */
  private async handleCategoryUpdated(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // For updates, we can use the same processCategory method
      // as it handles upsert operations
      const result = await this.categoriesService.processCategory(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.categoryId,
          1,
          'Category updated successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to update category',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle category deleted event
   */
  private async handleCategoryDeleted(
    entityId: string | undefined,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    if (!entityId) {
      return this.createErrorResult('Category ID is required for deletion');
    }

    try {
      // Find category by platform and external ID
      const category = await this.categoriesService.getCategoryByPlatformAndExternalId(
        context.platform,
        entityId,
        context.storeId
      );

      if (!category) {
        return this.createSkippedResult(
          'Category not found for deletion',
          entityId
        );
      }

      // Delete the category
      await this.categoriesService.deleteCategory(category.id);

      return this.createSuccessResult(
        category.id,
        1,
        'Category deleted successfully'
      );

    } catch (error) {
      throw error;
    }
  }

  /**
   * Transform payload for service consumption
   */
  protected transformPayload(payload: Record<string, any>, platform: Platform): Record<string, any> {
    switch (platform) {
      case Platform.NUVEMSHOP:
        return this.transformNuvemshopPayload(payload);
      
      case Platform.WOOCOMMERCE:
        return this.transformWooCommercePayload(payload);
      
      default:
        return payload;
    }
  }

  /**
   * Transform Nuvemshop payload
   */
  private transformNuvemshopPayload(payload: Record<string, any>): Record<string, any> {
    // Nuvemshop sends the actual category data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Transform WooCommerce payload
   */
  private transformWooCommercePayload(payload: Record<string, any>): Record<string, any> {
    // WooCommerce sends the category data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Check if category event should be processed
   */
  protected shouldProcessEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): { shouldProcess: boolean; reason?: string } {
    // Skip if no category data
    const categoryData = this.transformPayload(payload, context.platform);
    
    if (!categoryData || Object.keys(categoryData).length === 0) {
      return {
        shouldProcess: false,
        reason: 'No category data found in payload'
      };
    }

    // Skip if category has no name
    if (!categoryData.name && !categoryData.title) {
      return {
        shouldProcess: false,
        reason: 'Category name is required'
      };
    }

    return { shouldProcess: true };
  }

  /**
   * Validate category-specific required fields
   */
  protected validateRequiredFields(
    payload: Record<string, any>,
    platform: Platform
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const categoryData = this.transformPayload(payload, platform);

    // Common required fields
    if (!categoryData.id && !categoryData.external_id) {
      errors.push('Category ID is required');
    }

    if (!categoryData.name && !categoryData.title) {
      errors.push('Category name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get category processing metrics
   */
  getProcessingMetrics(): Record<string, any> {
    return {
      ...super.getProcessingMetrics(),
      supportedEvents: [
        WebhookEventType.CATEGORY_CREATED,
        WebhookEventType.CATEGORY_UPDATED,
        WebhookEventType.CATEGORY_DELETED,
      ],
      supportedPlatforms: [Platform.NUVEMSHOP, Platform.WOOCOMMERCE],
    };
  }
}
