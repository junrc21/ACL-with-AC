import { BaseEventProcessor } from './base-event-processor';
import { ProductsService } from '../products.service';
import { 
  WebhookEventContext, 
  WebhookProcessingResult,
  WebhookEventType
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext } from '@/shared/types/platform.types';

/**
 * Product event processor for handling product-related webhook events
 */
export class ProductEventProcessor extends BaseEventProcessor {
  private productsService: ProductsService;

  constructor(productsService?: ProductsService) {
    super();
    this.productsService = productsService || new ProductsService();
  }

  /**
   * Get processor name
   */
  getProcessorName(): string {
    return 'ProductEventProcessor';
  }

  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): string[] {
    return ['product'];
  }

  /**
   * Process product webhook event
   */
  async processEvent(context: WebhookEventContext, payload: Record<string, any>): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const entityId = this.extractEntityId(payload, context.platform);
    
    this.logProcessingStart(context, entityId);

    try {
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
        case WebhookEventType.PRODUCT_CREATED:
          result = await this.handleProductCreated(transformedPayload, strategyContext);
          break;
        
        case WebhookEventType.PRODUCT_UPDATED:
          result = await this.handleProductUpdated(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.PRODUCT_DELETED:
          result = await this.handleProductDeleted(entityId, strategyContext);
          break;
        
        default:
          return this.createSkippedResult(
            `Unsupported product event type: ${context.eventType}`,
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
   * Handle product created event
   */
  private async handleProductCreated(
    payload: Record<string, any>,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    try {
      const result = await this.productsService.processProduct(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.productId,
          1,
          'Product created successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to create product',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle product updated event
   */
  private async handleProductUpdated(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // For updates, we can use the same processProduct method
      // as it handles upsert operations
      const result = await this.productsService.processProduct(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.productId,
          1,
          'Product updated successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to update product',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle product deleted event
   */
  private async handleProductDeleted(
    entityId: string | undefined,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    if (!entityId) {
      return this.createErrorResult('Product ID is required for deletion');
    }

    try {
      // Find product by platform and external ID
      const product = await this.productsService.getProductByPlatformAndExternalId(
        context.platform,
        entityId,
        context.storeId
      );

      if (!product) {
        return this.createSkippedResult(
          'Product not found for deletion',
          entityId
        );
      }

      // Delete the product
      await this.productsService.deleteProduct(product.id);

      return this.createSuccessResult(
        product.id,
        1,
        'Product deleted successfully'
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
      case Platform.HOTMART:
        return this.transformHotmartPayload(payload);
      
      case Platform.NUVEMSHOP:
        return this.transformNuvemshopPayload(payload);
      
      case Platform.WOOCOMMERCE:
        return this.transformWooCommercePayload(payload);
      
      default:
        return payload;
    }
  }

  /**
   * Transform Hotmart payload
   */
  private transformHotmartPayload(payload: Record<string, any>): Record<string, any> {
    // Hotmart products usually come from sales data
    if (payload.data?.product) {
      return payload.data.product;
    }
    
    return payload.data || payload;
  }

  /**
   * Transform Nuvemshop payload
   */
  private transformNuvemshopPayload(payload: Record<string, any>): Record<string, any> {
    // Nuvemshop sends the actual product data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Transform WooCommerce payload
   */
  private transformWooCommercePayload(payload: Record<string, any>): Record<string, any> {
    // WooCommerce sends the product data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Check if product event should be processed
   */
  protected shouldProcessEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): { shouldProcess: boolean; reason?: string } {
    // Skip if no product data
    const productData = this.transformPayload(payload, context.platform);
    
    if (!productData || Object.keys(productData).length === 0) {
      return {
        shouldProcess: false,
        reason: 'No product data found in payload'
      };
    }

    // Skip if product is in draft status (platform-specific logic)
    if (context.platform === Platform.NUVEMSHOP && productData.published === false) {
      return {
        shouldProcess: false,
        reason: 'Product is not published'
      };
    }

    if (context.platform === Platform.WOOCOMMERCE && productData.status === 'draft') {
      return {
        shouldProcess: false,
        reason: 'Product is in draft status'
      };
    }

    return { shouldProcess: true };
  }

  /**
   * Validate product-specific required fields
   */
  protected validateRequiredFields(
    payload: Record<string, any>,
    platform: Platform
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const productData = this.transformPayload(payload, platform);

    // Common required fields
    if (!productData.id && !productData.external_id) {
      errors.push('Product ID is required');
    }

    // Platform-specific validation
    switch (platform) {
      case Platform.HOTMART:
        if (!productData.name && !productData.title) {
          errors.push('Product name is required');
        }
        break;
      
      case Platform.NUVEMSHOP:
        if (!productData.name) {
          errors.push('Product name is required');
        }
        break;
      
      case Platform.WOOCOMMERCE:
        if (!productData.name) {
          errors.push('Product name is required');
        }
        if (!productData.type) {
          errors.push('Product type is required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get product processing metrics
   */
  getProcessingMetrics(): Record<string, any> {
    return {
      ...super.getProcessingMetrics(),
      supportedEvents: [
        WebhookEventType.PRODUCT_CREATED,
        WebhookEventType.PRODUCT_UPDATED,
        WebhookEventType.PRODUCT_DELETED,
      ],
    };
  }
}
