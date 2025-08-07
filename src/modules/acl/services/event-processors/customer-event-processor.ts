import { BaseEventProcessor } from './base-event-processor';
import { CustomersService } from '../customers.service';
import { 
  WebhookEventContext, 
  WebhookProcessingResult,
  WebhookEventType
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext } from '@/shared/types/platform.types';

/**
 * Customer event processor for handling customer-related webhook events
 */
export class CustomerEventProcessor extends BaseEventProcessor {
  private customersService: CustomersService;

  constructor(customersService?: CustomersService) {
    super();
    this.customersService = customersService || new CustomersService();
  }

  /**
   * Get processor name
   */
  getProcessorName(): string {
    return 'CustomerEventProcessor';
  }

  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): string[] {
    return ['customer'];
  }

  /**
   * Process customer webhook event
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
        case WebhookEventType.CUSTOMER_CREATED:
          result = await this.handleCustomerCreated(transformedPayload, strategyContext);
          break;
        
        case WebhookEventType.CUSTOMER_UPDATED:
          result = await this.handleCustomerUpdated(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.CUSTOMER_DELETED:
          result = await this.handleCustomerDeleted(entityId, strategyContext);
          break;
        
        default:
          return this.createSkippedResult(
            `Unsupported customer event type: ${context.eventType}`,
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
   * Handle customer created event
   */
  private async handleCustomerCreated(
    payload: Record<string, any>,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    try {
      const result = await this.customersService.processCustomer(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.customerId,
          1,
          'Customer created successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to create customer',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle customer updated event
   */
  private async handleCustomerUpdated(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // For updates, we can use the same processCustomer method
      // as it handles upsert operations
      const result = await this.customersService.processCustomer(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.customerId,
          1,
          'Customer updated successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to update customer',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle customer deleted event
   */
  private async handleCustomerDeleted(
    entityId: string | undefined,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    if (!entityId) {
      return this.createErrorResult('Customer ID is required for deletion');
    }

    try {
      // Find customer by platform and external ID
      const customer = await this.customersService.getCustomerByPlatformAndExternalId(
        context.platform,
        entityId,
        context.storeId
      );

      if (!customer) {
        return this.createSkippedResult(
          'Customer not found for deletion',
          entityId
        );
      }

      // Delete the customer
      await this.customersService.deleteCustomer(customer.id);

      return this.createSuccessResult(
        customer.id,
        1,
        'Customer deleted successfully'
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
    // Hotmart customers usually come from sales data (buyer information)
    if (payload.data?.buyer) {
      return payload.data.buyer;
    }
    
    return payload.data || payload;
  }

  /**
   * Transform Nuvemshop payload
   */
  private transformNuvemshopPayload(payload: Record<string, any>): Record<string, any> {
    // Nuvemshop sends the actual customer data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Transform WooCommerce payload
   */
  private transformWooCommercePayload(payload: Record<string, any>): Record<string, any> {
    // WooCommerce sends the customer data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Check if customer event should be processed
   */
  protected shouldProcessEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): { shouldProcess: boolean; reason?: string } {
    // Skip if no customer data
    const customerData = this.transformPayload(payload, context.platform);
    
    if (!customerData || Object.keys(customerData).length === 0) {
      return {
        shouldProcess: false,
        reason: 'No customer data found in payload'
      };
    }

    // Skip if customer has no email (required for most operations)
    if (!customerData.email && !customerData.contact_email) {
      return {
        shouldProcess: false,
        reason: 'Customer email is required'
      };
    }

    // Skip test customers (platform-specific logic)
    if (context.platform === Platform.WOOCOMMERCE && customerData.role === 'test') {
      return {
        shouldProcess: false,
        reason: 'Test customer skipped'
      };
    }

    return { shouldProcess: true };
  }

  /**
   * Validate customer-specific required fields
   */
  protected validateRequiredFields(
    payload: Record<string, any>,
    platform: Platform
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const customerData = this.transformPayload(payload, platform);

    // Common required fields
    if (!customerData.id && !customerData.external_id) {
      errors.push('Customer ID is required');
    }

    // Platform-specific validation
    switch (platform) {
      case Platform.HOTMART:
        if (!customerData.email && !customerData.contact_email) {
          errors.push('Customer email is required');
        }
        break;
      
      case Platform.NUVEMSHOP:
        if (!customerData.email) {
          errors.push('Customer email is required');
        }
        break;
      
      case Platform.WOOCOMMERCE:
        if (!customerData.email) {
          errors.push('Customer email is required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get customer processing metrics
   */
  getProcessingMetrics(): Record<string, any> {
    return {
      ...super.getProcessingMetrics(),
      supportedEvents: [
        WebhookEventType.CUSTOMER_CREATED,
        WebhookEventType.CUSTOMER_UPDATED,
        WebhookEventType.CUSTOMER_DELETED,
      ],
    };
  }
}
