import { PrismaClient, Order, Platform, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '@/database';
import { OrderData, OrderFilterOptions, OrderStatistics } from '@/shared/types/order.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Order repository for database operations
 */
export class OrdersRepository {
  private logger = createPlatformLogger('DATABASE', 'OrdersRepository');

  constructor(private db: PrismaClient = prisma) {}

  /**
   * Create a new order
   */
  async create(orderData: OrderData): Promise<Order> {
    this.logger.info({
      platform: orderData.platform,
      externalId: orderData.externalId,
    }, 'Creating order');

    try {
      const order = await this.db.order.create({
        data: {
          platform: orderData.platform as Platform,
          externalId: orderData.externalId,
          storeId: orderData.storeId || null,
          customerId: orderData.customerId || null,
          orderNumber: orderData.orderNumber || null,
          token: orderData.token || null,
          status: orderData.status as OrderStatus,
          paymentStatus: orderData.paymentStatus as PaymentStatus,
          shippingStatus: orderData.shippingStatus || null,
          fulfillmentStatus: orderData.fulfillmentStatus || null,
          orderDate: orderData.orderDate,
          paidAt: orderData.processedAt || null,
          shippedAt: orderData.shippedAt || null,
          subtotal: orderData.subtotal,
          taxTotal: orderData.taxAmount || 0,
          shippingTotal: orderData.shippingAmount || 0,
          discountTotal: orderData.discountAmount || 0,
          total: orderData.totalAmount,
          currency: orderData.currency,
          customerEmail: orderData.customerEmail || null,
          customerPhone: orderData.customerPhone || null,
          shippingMethod: orderData.shippingMethod || null,
          trackingNumber: orderData.trackingNumber || null,
          trackingUrl: orderData.trackingUrl || null,
          metadata: orderData.metadata as any,
          createdAt: orderData.createdAt || new Date(),
          updatedAt: orderData.updatedAt || new Date(),
          
          // Create related records
          items: orderData.items ? {
            create: orderData.items.map(item => ({
              platform: orderData.platform as Platform,
              externalId: item.externalId || null,
              productId: item.productId || null,
              variantId: item.variantId || null,
              name: item.name,
              sku: item.sku || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              taxAmount: item.taxAmount || 0,
              metadata: item.metadata as any,
            }))
          } : undefined,
          
          payments: orderData.payments ? {
            create: orderData.payments.map(payment => ({
              platform: orderData.platform as Platform,
              externalId: payment.externalId || null,
              transactionId: payment.transactionId || null,
              method: payment.method,
              status: payment.status === 'AUTHORIZED' ? 'PENDING' : payment.status, // Map AUTHORIZED to PENDING
              amount: payment.amount,
              currency: payment.currency,
              processedAt: payment.processedAt || null,
              gateway: payment.gateway || null,
              gatewayTransactionId: payment.gatewayTransactionId || null,
              installments: payment.installments || null,
              fees: payment.fees || null,
              netAmount: payment.netAmount || null,
              metadata: payment.metadata as any,
            }))
          } : undefined,
          
          notes: orderData.notes ? {
            create: orderData.notes.map(note => ({
              platform: orderData.platform as Platform,
              externalId: note.externalId || null,
              content: note.content,
              isCustomerNote: note.isCustomerNote,
              author: note.author || null,
              metadata: note.metadata as any,
            }))
          } : undefined,
        },
        include: {
          items: true,
          payments: true,
          refunds: true,
          notes: true,
          commissions: true,
          billingAddress: true,
          shippingAddress: true,
        },
      });

      this.logger.info({
        orderId: order.id,
        platform: order.platform,
        externalId: order.externalId,
      }, 'Order created successfully');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        platform: orderData.platform,
        externalId: orderData.externalId,
      }, 'Failed to create order');
      throw error;
    }
  }

  /**
   * Update an existing order
   */
  async update(id: string, orderData: Partial<OrderData>): Promise<Order> {
    this.logger.info({
      orderId: id,
    }, 'Updating order');

    try {
      const order = await this.db.order.update({
        where: { id },
        data: {
          ...(orderData.status && { status: orderData.status as OrderStatus }),
          ...(orderData.paymentStatus && { paymentStatus: orderData.paymentStatus as PaymentStatus }),
          ...(orderData.shippingStatus && { shippingStatus: orderData.shippingStatus }),
          ...(orderData.fulfillmentStatus && { fulfillmentStatus: orderData.fulfillmentStatus }),
          ...(orderData.processedAt && { paidAt: orderData.processedAt }),
          ...(orderData.shippedAt && { shippedAt: orderData.shippedAt }),
          ...(orderData.subtotal !== undefined && { subtotal: orderData.subtotal }),
          ...(orderData.taxAmount !== undefined && { taxTotal: orderData.taxAmount }),
          ...(orderData.shippingAmount !== undefined && { shippingTotal: orderData.shippingAmount }),
          ...(orderData.discountAmount !== undefined && { discountTotal: orderData.discountAmount }),
          ...(orderData.totalAmount !== undefined && { total: orderData.totalAmount }),
          ...(orderData.trackingNumber && { trackingNumber: orderData.trackingNumber }),
          ...(orderData.trackingUrl && { trackingUrl: orderData.trackingUrl }),
          ...(orderData.shippingMethod && { shippingMethod: orderData.shippingMethod }),
          ...(orderData.metadata && { metadata: orderData.metadata as any }),
          updatedAt: new Date(),
        },
        include: {
          items: true,
          payments: true,
          refunds: true,
          notes: true,
          commissions: true,
          billingAddress: true,
          shippingAddress: true,
        },
      });

      this.logger.info({
        orderId: order.id,
        platform: order.platform,
        externalId: order.externalId,
      }, 'Order updated successfully');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        orderId: id,
      }, 'Failed to update order');
      throw error;
    }
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<Order | null> {
    try {
      const order = await this.db.order.findUnique({
        where: { id },
        include: {
          items: true,
          payments: true,
          refunds: true,
          notes: true,
          commissions: true,
          billingAddress: true,
          shippingAddress: true,
          customer: true,
          store: true,
        },
      });

      this.logger.debug({
        orderId: id,
        found: !!order,
      }, 'Order lookup by ID');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        orderId: id,
      }, 'Failed to find order by ID');
      throw error;
    }
  }

  /**
   * Find order by platform and external ID
   */
  async findByPlatformAndExternalId(
    platform: Platform,
    externalId: string,
    storeId?: string
  ): Promise<Order | null> {
    try {
      const where: any = {
        platform,
        externalId,
      };

      if (storeId) {
        where.storeId = storeId;
      }

      const order = await this.db.order.findFirst({
        where,
        include: {
          items: true,
          payments: true,
          refunds: true,
          notes: true,
          commissions: true,
          billingAddress: true,
          shippingAddress: true,
        },
      });

      this.logger.debug({
        platform,
        externalId,
        storeId,
        found: !!order,
      }, 'Order lookup by platform and external ID');

      return order;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
        storeId,
      }, 'Failed to find order by platform and external ID');
      throw error;
    }
  }

  /**
   * Find orders with filters and pagination
   */
  async findMany(filters: OrderFilterOptions): Promise<{ orders: Order[]; total: number }> {
    try {
      const where: any = {};

      if (filters.platform) where.platform = filters.platform;
      if (filters.storeId) where.storeId = filters.storeId;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.status) where.status = filters.status;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
      if (filters.shippingStatus) where.shippingStatus = filters.shippingStatus;
      if (filters.fulfillmentStatus) where.fulfillmentStatus = filters.fulfillmentStatus;
      if (filters.currency) where.currency = filters.currency;

      // Date filters
      if (filters.orderDateFrom || filters.orderDateTo) {
        where.orderDate = {};
        if (filters.orderDateFrom) where.orderDate.gte = filters.orderDateFrom;
        if (filters.orderDateTo) where.orderDate.lte = filters.orderDateTo;
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = filters.createdAfter;
        if (filters.createdBefore) where.createdAt.lte = filters.createdBefore;
      }

      // Amount filters
      if (filters.minAmount || filters.maxAmount) {
        where.total = {};
        if (filters.minAmount) where.total.gte = filters.minAmount;
        if (filters.maxAmount) where.total.lte = filters.maxAmount;
      }

      // Search filter
      if (filters.search) {
        where.OR = [
          { orderNumber: { contains: filters.search, mode: 'insensitive' } },
          { customerEmail: { contains: filters.search, mode: 'insensitive' } },
          { externalId: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const orderBy: any = {};
      if (filters.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || 'desc';
      } else {
        orderBy.orderDate = 'desc';
      }

      const [orders, total] = await Promise.all([
        this.db.order.findMany({
          where,
          include: {
            items: true,
            payments: true,
            refunds: true,
            notes: true,
            commissions: true,
            billingAddress: true,
            shippingAddress: true,
            customer: true,
          },
          orderBy,
          take: filters.limit || 50,
          skip: filters.offset || 0,
        }),
        this.db.order.count({ where }),
      ]);

      this.logger.debug({
        filters,
        count: orders.length,
        total,
      }, 'Orders query executed');

      return { orders, total };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to find orders');
      throw error;
    }
  }

  /**
   * Upsert order (create or update)
   */
  async upsert(orderData: OrderData): Promise<Order> {
    this.logger.info({
      platform: orderData.platform,
      externalId: orderData.externalId,
    }, 'Upserting order');

    try {
      const existingOrder = await this.findByPlatformAndExternalId(
        orderData.platform as Platform,
        orderData.externalId,
        orderData.storeId
      );

      if (existingOrder) {
        return await this.update(existingOrder.id, orderData);
      } else {
        return await this.create(orderData);
      }
    } catch (error) {
      this.logger.error({
        error,
        platform: orderData.platform,
        externalId: orderData.externalId,
      }, 'Failed to upsert order');
      throw error;
    }
  }

  /**
   * Delete order by ID
   */
  async delete(id: string): Promise<Order> {
    this.logger.info({
      orderId: id,
    }, 'Deleting order');

    try {
      const order = await this.db.order.delete({
        where: { id },
        include: {
          items: true,
          payments: true,
          refunds: true,
          notes: true,
          commissions: true,
        },
      });

      this.logger.info({
        orderId: order.id,
        platform: order.platform,
        externalId: order.externalId,
      }, 'Order deleted successfully');

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
  async getStatistics(platform?: Platform, storeId?: string): Promise<OrderStatistics> {
    try {
      const where: any = {};
      if (platform) where.platform = platform;
      if (storeId) where.storeId = storeId;

      const [
        totalOrders,
        totalRevenue,
        statusBreakdown,
        paymentStatusBreakdown,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
      ] = await Promise.all([
        // Total orders
        this.db.order.count({ where }),

        // Total revenue
        this.db.order.aggregate({
          where,
          _sum: { total: true },
        }),

        // Status breakdown
        this.db.order.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),

        // Payment status breakdown
        this.db.order.groupBy({
          by: ['paymentStatus'],
          where,
          _count: { paymentStatus: true },
        }),

        // Orders today
        this.db.order.count({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Orders this week
        this.db.order.count({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            },
          },
        }),

        // Orders this month
        this.db.order.count({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Revenue today
        this.db.order.aggregate({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: { total: true },
        }),

        // Revenue this week
        this.db.order.aggregate({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            },
          },
          _sum: { total: true },
        }),

        // Revenue this month
        this.db.order.aggregate({
          where: {
            ...where,
            orderDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { total: true },
        }),
      ]);

      const totalRevenueValue = totalRevenue._sum.total?.toNumber() || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenueValue / totalOrders : 0;

      // Convert status breakdowns to proper format
      const statusBreakdownMap: Record<string, number> = {};
      statusBreakdown.forEach(item => {
        statusBreakdownMap[item.status] = item._count.status;
      });

      const paymentStatusBreakdownMap: Record<string, number> = {};
      paymentStatusBreakdown.forEach(item => {
        paymentStatusBreakdownMap[item.paymentStatus] = item._count.paymentStatus;
      });

      const statistics: OrderStatistics = {
        totalOrders,
        totalRevenue: totalRevenueValue,
        averageOrderValue,
        currency: 'USD', // Default currency, could be made configurable
        statusBreakdown: statusBreakdownMap as any,
        paymentStatusBreakdown: paymentStatusBreakdownMap as any,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        revenueToday: revenueToday._sum.total?.toNumber() || 0,
        revenueThisWeek: revenueThisWeek._sum.total?.toNumber() || 0,
        revenueThisMonth: revenueThisMonth._sum.total?.toNumber() || 0,
      };

      this.logger.debug({
        platform,
        storeId,
        statistics,
      }, 'Order statistics calculated');

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
}
