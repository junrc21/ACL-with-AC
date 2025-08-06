import { Request, Response } from 'express';
import { OrdersService } from '../services/orders.service';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { asyncHandler, ApiError } from '@/middlewares/error.middleware';
import { 
  OrderSchema,
  OrderQuerySchema,
  OrderSyncSchema,
  OrderUpdateSchema,
  OrderStatsQuerySchema
} from '../dto/order.dto';
import { Platform } from '@/shared/types/platform.types';
import { OrderStatus, PaymentStatus } from '@/shared/types/order.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Orders controller for handling HTTP requests
 */
export class OrdersController {
  private logger = createPlatformLogger('CONTROLLER', 'OrdersController');

  constructor(
    private ordersService: OrdersService = new OrdersService()
  ) {}

  /**
   * Create/process a single order
   * POST /api/acl/orders
   */
  public createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
    }, 'Processing order creation request');

    // Validate request body
    const validatedData = OrderSchema.parse(req.body);

    // Create strategy context
    const context = {
      platform,
      storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Process order
    const result = await this.ordersService.processOrder(
      platform,
      validatedData,
      context
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          order: result.order,
          externalId: result.externalId,
          platform: result.platform,
          isNew: result.isNew,
          warnings: result.warnings,
          processingTime: result.processingTime,
        },
        message: 'Order processed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_PROCESSING_FAILED',
          message: 'Failed to process order data',
          details: {
            externalId: result.externalId,
            platform: result.platform,
            errors: result.errors,
            processingTime: result.processingTime,
          },
        },
      });
    }
  });

  /**
   * Synchronize orders from platform
   * POST /api/acl/orders/sync
   */
  public syncOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
    }, 'Processing order synchronization request');

    // Validate request body
    const validatedData = OrderSyncSchema.parse(req.body);

    // Create strategy context
    const context = {
      platform: validatedData.platform,
      storeId: validatedData.storeId || storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Sync orders
    const result = await this.ordersService.syncOrders(
      validatedData.platform,
      context,
      {
        dateFrom: validatedData.dateFrom,
        dateTo: validatedData.dateTo,
        limit: validatedData.limit,
        forceUpdate: validatedData.forceUpdate,
      }
    );

    res.status(200).json({
      success: result.success,
      data: {
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        warnings: result.warnings,
        duration: result.duration,
      },
      message: result.success 
        ? 'Orders synchronized successfully' 
        : 'Order synchronization completed with errors',
    });
  });

  /**
   * Get orders with filters and pagination
   * GET /api/acl/orders
   */
  public getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
      query: req.query,
    }, 'Processing get orders request');

    // Validate query parameters
    const filters = OrderQuerySchema.parse({
      ...req.query,
      platform: req.query.platform || platform,
      storeId: req.query.storeId || storeId,
    });

    // Get orders
    const result = await this.ordersService.listOrders(filters);

    res.status(200).json({
      success: true,
      data: {
        orders: result.orders,
        pagination: result.pagination,
      },
      message: 'Orders retrieved successfully',
    });
  });

  /**
   * Get order by ID
   * GET /api/acl/orders/:id
   */
  public getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({
      orderId: id,
      method: req.method,
      path: req.path,
    }, 'Processing get order by ID request');

    const order = await this.ordersService.getOrderById(id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.status(200).json({
      success: true,
      data: { order },
      message: 'Order retrieved successfully',
    });
  });

  /**
   * Update order
   * PUT /api/acl/orders/:id
   */
  public updateOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({
      orderId: id,
      method: req.method,
      path: req.path,
    }, 'Processing update order request');

    // Validate request body
    const updateData = OrderUpdateSchema.parse(req.body);

    // Update order
    const order = await this.ordersService.updateOrderStatus(
      id,
      updateData.status || OrderStatus.PENDING,
      updateData.paymentStatus,
      updateData.metadata
    );

    res.status(200).json({
      success: true,
      data: { order },
      message: 'Order updated successfully',
    });
  });

  /**
   * Delete order
   * DELETE /api/acl/orders/:id
   */
  public deleteOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({
      orderId: id,
      method: req.method,
      path: req.path,
    }, 'Processing delete order request');

    const order = await this.ordersService.deleteOrder(id);

    res.status(200).json({
      success: true,
      data: { order },
      message: 'Order deleted successfully',
    });
  });

  /**
   * Get order statistics
   * GET /api/acl/orders/statistics
   */
  public getOrderStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
      query: req.query,
    }, 'Processing get order statistics request');

    // Validate query parameters
    const filters = OrderStatsQuerySchema.parse({
      ...req.query,
      platform: req.query.platform || platform,
      storeId: req.query.storeId || storeId,
    });

    // Get statistics
    const statistics = await this.ordersService.getOrderStatistics(
      filters.platform,
      filters.storeId
    );

    res.status(200).json({
      success: true,
      data: { statistics },
      message: 'Order statistics retrieved successfully',
    });
  });

  /**
   * Search orders
   * GET /api/acl/orders/search
   */
  public searchOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;
    const { q: query, limit } = req.query;

    if (!query || typeof query !== 'string') {
      throw new ApiError(400, 'Search query is required');
    }

    this.logger.info({
      platform,
      storeId,
      query,
      method: req.method,
      path: req.path,
    }, 'Processing search orders request');

    // Search orders
    const orders = await this.ordersService.searchOrders(
      query,
      platform,
      storeId,
      limit ? parseInt(limit as string) : 20
    );

    res.status(200).json({
      success: true,
      data: { orders },
      message: 'Orders search completed successfully',
    });
  });
}
