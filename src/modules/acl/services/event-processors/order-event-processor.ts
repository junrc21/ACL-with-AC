import { BaseEventProcessor } from './base-event-processor';
import { OrdersService } from '../orders.service';
import { 
  WebhookEventContext, 
  WebhookProcessingResult,
  WebhookEventType
} from '@/shared/types/webhook.types';
import { Platform, StrategyContext } from '@/shared/types/platform.types';

/**
 * Order event processor for handling order-related webhook events
 */
export class OrderEventProcessor extends BaseEventProcessor {
  private ordersService: OrdersService;

  constructor(ordersService?: OrdersService) {
    super();
    this.ordersService = ordersService || new OrdersService();
  }

  /**
   * Get processor name
   */
  getProcessorName(): string {
    return 'OrderEventProcessor';
  }

  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): string[] {
    return ['order', 'purchase', 'subscription'];
  }

  /**
   * Process order webhook event
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
        case WebhookEventType.ORDER_CREATED:
        case WebhookEventType.PURCHASE_COMPLETED:
          result = await this.handleOrderCreated(transformedPayload, strategyContext);
          break;
        
        case WebhookEventType.ORDER_UPDATED:
        case WebhookEventType.ORDER_PAID:
        case WebhookEventType.ORDER_FULFILLED:
        case WebhookEventType.ORDER_SHIPPED:
        case WebhookEventType.ORDER_DELIVERED:
          result = await this.handleOrderUpdated(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.ORDER_CANCELLED:
          result = await this.handleOrderCancelled(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.ORDER_REFUNDED:
        case WebhookEventType.PURCHASE_REFUNDED:
          result = await this.handleOrderRefunded(transformedPayload, strategyContext, entityId);
          break;
        
        case WebhookEventType.SUBSCRIPTION_CREATED:
        case WebhookEventType.SUBSCRIPTION_RENEWED:
        case WebhookEventType.SUBSCRIPTION_CANCELLATION:
          result = await this.handleSubscriptionEvent(transformedPayload, strategyContext, context.eventType);
          break;
        
        default:
          return this.createSkippedResult(
            `Unsupported order event type: ${context.eventType}`,
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
   * Handle order created event
   */
  private async handleOrderCreated(
    payload: Record<string, any>,
    context: StrategyContext
  ): Promise<WebhookProcessingResult> {
    try {
      const result = await this.ordersService.processOrder(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.orderId,
          1,
          'Order created successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to create order',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle order updated event
   */
  private async handleOrderUpdated(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // For updates, we can use the same processOrder method
      // as it handles upsert operations
      const result = await this.ordersService.processOrder(
        context.platform,
        payload,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.orderId,
          1,
          'Order updated successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to update order',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle order cancelled event
   */
  private async handleOrderCancelled(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Update order status to cancelled
      const orderData = { ...payload, status: 'cancelled' };
      
      const result = await this.ordersService.processOrder(
        context.platform,
        orderData,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.orderId,
          1,
          'Order cancelled successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to cancel order',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle order refunded event
   */
  private async handleOrderRefunded(
    payload: Record<string, any>,
    context: StrategyContext,
    entityId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Update order status to refunded
      const orderData = { ...payload, status: 'refunded' };
      
      const result = await this.ordersService.processOrder(
        context.platform,
        orderData,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.orderId,
          1,
          'Order refunded successfully'
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || 'Failed to process refund',
          result.externalId
        );
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle subscription events
   */
  private async handleSubscriptionEvent(
    payload: Record<string, any>,
    context: StrategyContext,
    eventType: WebhookEventType
  ): Promise<WebhookProcessingResult> {
    try {
      // Map subscription event to order status
      let status = 'active';
      switch (eventType) {
        case WebhookEventType.SUBSCRIPTION_CREATED:
          status = 'active';
          break;
        case WebhookEventType.SUBSCRIPTION_RENEWED:
          status = 'renewed';
          break;
        case WebhookEventType.SUBSCRIPTION_CANCELLATION:
          status = 'cancelled';
          break;
      }

      const orderData = { ...payload, status, type: 'subscription' };
      
      const result = await this.ordersService.processOrder(
        context.platform,
        orderData,
        context
      );

      if (result.success) {
        return this.createSuccessResult(
          result.orderId,
          1,
          `Subscription ${status} successfully`
        );
      } else {
        return this.createErrorResult(
          result.errors?.join(', ') || `Failed to process subscription ${status}`,
          result.externalId
        );
      }

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
    // Hotmart orders come from purchase/subscription data
    if (payload.data?.purchase) {
      return {
        ...payload.data.purchase,
        buyer: payload.data.buyer,
        product: payload.data.product,
        subscription: payload.data.subscription,
      };
    }
    
    return payload.data || payload;
  }

  /**
   * Transform Nuvemshop payload
   */
  private transformNuvemshopPayload(payload: Record<string, any>): Record<string, any> {
    // Nuvemshop sends the actual order data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Transform WooCommerce payload
   */
  private transformWooCommercePayload(payload: Record<string, any>): Record<string, any> {
    // WooCommerce sends the order data in the 'data' field
    return payload.data || payload;
  }

  /**
   * Check if order event should be processed
   */
  protected shouldProcessEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): { shouldProcess: boolean; reason?: string } {
    // Skip if no order data
    const orderData = this.transformPayload(payload, context.platform);
    
    if (!orderData || Object.keys(orderData).length === 0) {
      return {
        shouldProcess: false,
        reason: 'No order data found in payload'
      };
    }

    // Skip test orders (platform-specific logic)
    if (context.platform === Platform.WOOCOMMERCE && orderData.status === 'test') {
      return {
        shouldProcess: false,
        reason: 'Test order skipped'
      };
    }

    // Skip orders with zero total (unless it's a free product)
    if (orderData.total === 0 && !orderData.is_free && context.platform !== Platform.HOTMART) {
      return {
        shouldProcess: false,
        reason: 'Zero total order skipped'
      };
    }

    return { shouldProcess: true };
  }

  /**
   * Get order processing metrics
   */
  getProcessingMetrics(): Record<string, any> {
    return {
      ...super.getProcessingMetrics(),
      supportedEvents: [
        WebhookEventType.ORDER_CREATED,
        WebhookEventType.ORDER_UPDATED,
        WebhookEventType.ORDER_PAID,
        WebhookEventType.ORDER_CANCELLED,
        WebhookEventType.ORDER_FULFILLED,
        WebhookEventType.ORDER_SHIPPED,
        WebhookEventType.ORDER_DELIVERED,
        WebhookEventType.ORDER_REFUNDED,
        WebhookEventType.PURCHASE_COMPLETED,
        WebhookEventType.PURCHASE_REFUNDED,
        WebhookEventType.SUBSCRIPTION_CREATED,
        WebhookEventType.SUBSCRIPTION_RENEWED,
        WebhookEventType.SUBSCRIPTION_CANCELLATION,
      ],
    };
  }
}
