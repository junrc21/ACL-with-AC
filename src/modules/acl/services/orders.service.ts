import { Order } from '@prisma/client';
import { OrdersRepository } from '../repositories/orders.repository';
import { orderStrategyFactory } from '../strategies/OrderStrategyFactory';
import { 
  OrderData, 
  OrderProcessingResult,
  OrderSyncResult,
  OrderFilterOptions,
  OrderStatistics,
  OrderStatus,
  PaymentStatus 
} from '@/shared/types/order.types';
import { Platform, StrategyContext, PlatformError } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Order service for business logic
 */
export class OrdersService {
  private logger = createPlatformLogger('SERVICE', 'OrdersService');

  constructor(
    private ordersRepository: OrdersRepository = new OrdersRepository()
  ) {}

  /**
   * Process order data from any platform
   */
  async processOrder(
    platform: Platform,
    data: any,
    context: StrategyContext
  ): Promise<OrderProcessingResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      storeId: context.storeId,
    }, 'Processing order data');

    try {
      // Get platform strategy
      const strategy = orderStrategyFactory.createStrategy(platform);

      // Process order using strategy
      const result = await strategy.processOrder(data, context);
      
      if (!result.success || !result.order) {
        return result;
      }

      // Save to database
      const order = await this.ordersRepository.upsert(result.order);

      const processingTime = Date.now() - startTime;

      this.logger.info({
        orderId: order.id,
        platform,
        externalId: order.externalId,
        processingTime,
      }, 'Order processed successfully');

      return {
        success: true,
        order: result.order,
        externalId: order.externalId,
        platform,
        isNew: result.isNew,
        warnings: result.warnings,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error({
        error,
        platform,
        storeId: context.storeId,
        processingTime,
      }, 'Failed to process order');

      return {
        success: false,
        externalId: data?.id?.toString() || 'unknown',
        platform,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        processingTime,
      };
    }
  }

  /**
   * Synchronize orders from platform
   */
  async syncOrders(
    platform: Platform,
    context: StrategyContext,
    options: {
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      forceUpdate?: boolean;
    } = {}
  ): Promise<OrderSyncResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      storeId: context.storeId,
      options,
    }, 'Starting order synchronization');

    try {
      // Get platform strategy
      const strategy = orderStrategyFactory.createStrategy(platform);

      // This would typically fetch data from the platform API
      // For now, we'll simulate with empty array
      const platformOrders: any[] = [];

      // Process orders in batch
      const result = await strategy.processOrdersBatch(platformOrders, context);

      // Save successful orders to database
      for (const orderResult of result.details) {
        if (orderResult.success && orderResult.order) {
          await this.ordersRepository.upsert(orderResult.order);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info({
        platform,
        storeId: context.storeId,
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        duration,
      }, 'Order synchronization completed');

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error({
        error,
        platform,
        storeId: context.storeId,
        duration,
      }, 'Order synchronization failed');

      return {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        errors: 1,
        warnings: [error instanceof Error ? error.message : 'Unknown error occurred'],
        details: [],
        duration,
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    try {
      const order = await this.ordersRepository.findById(id);
      
      this.logger.debug({
        orderId: id,
        found: !!order,
      }, 'Order lookup by ID');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        orderId: id,
      }, 'Failed to get order by ID');
      throw error;
    }
  }

  /**
   * Get order by platform and external ID
   */
  async getOrderByExternalId(
    platform: Platform,
    externalId: string,
    storeId?: string
  ): Promise<Order | null> {
    try {
      const order = await this.ordersRepository.findByPlatformAndExternalId(
        platform,
        externalId,
        storeId
      );
      
      this.logger.debug({
        platform,
        externalId,
        storeId,
        found: !!order,
      }, 'Order lookup by external ID');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
        storeId,
      }, 'Failed to get order by external ID');
      throw error;
    }
  }

  /**
   * List orders with filters and pagination
   */
  async listOrders(filters: OrderFilterOptions): Promise<{
    orders: Order[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    try {
      const { orders, total } = await this.ordersRepository.findMany(filters);
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      const pagination = {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0,
      };

      this.logger.debug({
        filters,
        count: orders.length,
        total,
        pagination,
      }, 'Orders listed');

      return { orders, pagination };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to list orders');
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    paymentStatus?: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<Order> {
    try {
      const updateData: Partial<OrderData> = {
        status,
        ...(paymentStatus && { paymentStatus }),
        ...(metadata && { metadata }),
        updatedAt: new Date(),
      };

      const order = await this.ordersRepository.update(id, updateData);

      this.logger.info({
        orderId: id,
        status,
        paymentStatus,
      }, 'Order status updated');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        orderId: id,
        status,
        paymentStatus,
      }, 'Failed to update order status');
      throw error;
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(id: string): Promise<Order> {
    try {
      const order = await this.ordersRepository.delete(id);

      this.logger.info({
        orderId: id,
        platform: order.platform,
        externalId: order.externalId,
      }, 'Order deleted');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        orderId: id,
      }, 'Failed to delete order');
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(
    platform?: Platform,
    storeId?: string
  ): Promise<OrderStatistics> {
    try {
      const statistics = await this.ordersRepository.getStatistics(platform, storeId);

      this.logger.debug({
        platform,
        storeId,
        statistics,
      }, 'Order statistics retrieved');

      return statistics;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId,
      }, 'Failed to get order statistics');
      throw error;
    }
  }

  /**
   * Search orders by customer email or order number
   */
  async searchOrders(
    query: string,
    platform?: Platform,
    storeId?: string,
    limit: number = 20
  ): Promise<Order[]> {
    try {
      const filters: OrderFilterOptions = {
        search: query,
        platform,
        storeId,
        limit,
        offset: 0,
      };

      const { orders } = await this.ordersRepository.findMany(filters);

      this.logger.debug({
        query,
        platform,
        storeId,
        count: orders.length,
      }, 'Orders searched');

      return orders;
    } catch (error) {
      this.logger.error({
        error,
        query,
        platform,
        storeId,
      }, 'Failed to search orders');
      throw error;
    }
  }
}
