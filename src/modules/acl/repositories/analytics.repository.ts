/**
 * Analytics repository for complex data aggregation queries
 */

import { PrismaClient, Platform } from '@prisma/client';
import { prisma } from '@/database';
import { createPlatformLogger } from '@/shared/utils/logger';
import {
  AnalyticsQueryOptions,
  SalesAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  PerformanceMetrics,
  DashboardSummary,
  DateRange
} from '@/shared/types/analytics.types';

/**
 * Analytics repository for database operations
 */
export class AnalyticsRepository {
  private logger = createPlatformLogger('DATABASE', 'AnalyticsRepository');

  constructor(private db: PrismaClient = prisma) {}

  /**
   * Get sales analytics data
   */
  async getSalesAnalytics(options: AnalyticsQueryOptions): Promise<Partial<SalesAnalytics>> {
    try {
      const { platform, storeId, dateRange, groupBy = 'day' } = options;
      
      // Build where clause
      const where: any = {};
      if (platform) where.platform = platform;
      if (storeId) where.storeId = storeId;
      if (dateRange) {
        where.orderDate = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      // Get sales summary
      const summary = await this.getSalesSummary(where);
      
      // Get time series data
      const timeSeries = await this.getSalesTimeSeries(where, groupBy);
      
      // Get platform breakdown
      const platformBreakdown = await this.getSalesPlatformBreakdown(where);
      
      // Get top products
      const topProducts = await this.getTopProductsBySales(where, options.limit || 10);

      return {
        summary,
        timeSeries,
        platformBreakdown,
        topProducts,
      };
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      }, 'Failed to get sales analytics');
      throw error;
    }
  }

  /**
   * Get customer analytics data
   */
  async getCustomerAnalytics(options: AnalyticsQueryOptions): Promise<Partial<CustomerAnalytics>> {
    try {
      const { platform, storeId, dateRange } = options;
      
      // Build where clause
      const where: any = {};
      if (platform) where.platform = platform;
      if (storeId) where.storeId = storeId;
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      // Get customer summary
      const summary = await this.getCustomerSummary(where, dateRange);
      
      // Get customer segmentation
      const segmentation = await this.getCustomerSegmentation(where);
      
      // Get platform breakdown
      const platformBreakdown = await this.getCustomerPlatformBreakdown(where);
      
      // Get top customers
      const topCustomers = await this.getTopCustomers(where, options.limit || 10);

      return {
        summary,
        segmentation,
        platformBreakdown,
        topCustomers,
      };
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      }, 'Failed to get customer analytics');
      throw error;
    }
  }

  /**
   * Get product analytics data
   */
  async getProductAnalytics(options: AnalyticsQueryOptions): Promise<Partial<ProductAnalytics>> {
    try {
      const { platform, storeId, dateRange } = options;
      
      // Build where clause for products
      const productWhere: any = {};
      if (platform) productWhere.platform = platform;
      if (storeId) productWhere.storeId = storeId;

      // Build where clause for orders (for revenue data)
      const orderWhere: any = {};
      if (platform) orderWhere.platform = platform;
      if (storeId) orderWhere.storeId = storeId;
      if (dateRange) {
        orderWhere.orderDate = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      // Get product summary
      const summary = await this.getProductSummary(productWhere, orderWhere);
      
      // Get top products
      const topProducts = await this.getTopProductsPerformance(orderWhere, options.limit || 10);
      
      // Get category performance
      const categoryPerformance = await this.getCategoryPerformance(orderWhere);
      
      // Get platform breakdown
      const platformBreakdown = await this.getProductPlatformBreakdown(productWhere);
      
      // Get stock analysis
      const stockAnalysis = await this.getStockAnalysis(productWhere);

      return {
        summary,
        topProducts,
        categoryPerformance,
        platformBreakdown,
        stockAnalysis,
      };
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      }, 'Failed to get product analytics');
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(options: AnalyticsQueryOptions): Promise<Partial<PerformanceMetrics>> {
    try {
      const { platform, dateRange } = options;
      
      // Build where clause
      const where: any = {};
      if (platform) where.platform = platform;
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        };
      }

      // Get webhook health
      const webhookHealth = await this.getWebhookHealth(where);
      
      // Get sync status
      const syncStatus = await this.getSyncStatus(where);
      
      // Get queue status
      const queueStatus = await this.getQueueStatus();

      return {
        webhookHealth,
        syncStatus,
        queueStatus,
      };
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      }, 'Failed to get performance metrics');
      throw error;
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(options: AnalyticsQueryOptions): Promise<Partial<DashboardSummary>> {
    try {
      const { platform, storeId } = options;
      
      // Build where clause
      const where: any = {};
      if (platform) where.platform = platform;
      if (storeId) where.storeId = storeId;

      // Get KPIs
      const kpis = await this.getDashboardKPIs(where);
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity(where, 20);
      
      // Get platform status
      const platformStatus = await this.getPlatformStatus();

      return {
        kpis,
        recentActivity,
        platformStatus,
      };
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      }, 'Failed to get dashboard summary');
      throw error;
    }
  }

  /**
   * Private helper methods for complex queries
   */
  private async getSalesSummary(where: any) {
    const result = await this.db.order.aggregate({
      where,
      _sum: {
        total: true,
        discountTotal: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        total: true,
      },
    });

    const refunds = await this.db.refund.aggregate({
      where: {
        order: where,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenue = Number(result._sum.total || 0);
    const totalRefunds = Number(refunds._sum.amount || 0);
    const totalOrders = result._count.id;
    const averageOrderValue = Number(result._avg.total || 0);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalRefunds,
      refundRate: totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0,
    };
  }

  private async getSalesTimeSeries(where: any, groupBy: string) {
    // This would need to be implemented with raw SQL for proper date grouping
    // For now, returning a simplified version
    const orders = await this.db.order.findMany({
      where,
      select: {
        orderDate: true,
        total: true,
        discountTotal: true,
      },
      orderBy: {
        orderDate: 'asc',
      },
    });

    // Group by date (simplified - would need proper SQL grouping in production)
    const grouped = orders.reduce((acc: any, order) => {
      const date = order.orderDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          revenue: 0,
          orders: 0,
          averageOrderValue: 0,
          refunds: 0,
        };
      }
      acc[date].revenue += Number(order.total);
      acc[date].orders += 1;
      return acc;
    }, {});

    return Object.values(grouped).map((item: any) => ({
      ...item,
      averageOrderValue: item.orders > 0 ? item.revenue / item.orders : 0,
    }));
  }

  private async getSalesPlatformBreakdown(where: any) {
    const result = await this.db.order.groupBy({
      by: ['platform'],
      where,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    const total = result.reduce((sum, item) => sum + Number(item._sum.total || 0), 0);

    return result.map(item => ({
      platform: item.platform,
      revenue: Number(item._sum.total || 0),
      orders: item._count.id,
      percentage: total > 0 ? (Number(item._sum.total || 0) / total) * 100 : 0,
    }));
  }

  private async getTopProductsBySales(where: any, limit: number) {
    const result = await this.db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: where,
        productId: {
          not: null,
        },
      },
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productIds = result.map(item => item.productId).filter(Boolean) as string[];
    const products = await this.db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        platform: true,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return result.map(item => {
      const product = productMap.get(item.productId!);
      return {
        productId: item.productId!,
        name: product?.name || 'Unknown Product',
        revenue: Number(item._sum.totalPrice || 0),
        orders: Number(item._sum.quantity || 0),
        platform: product?.platform || Platform.WOOCOMMERCE,
      };
    });
  }

  private async getCustomerSummary(where: any, dateRange?: DateRange) {
    const totalCustomers = await this.db.customer.count({ where });

    let newCustomers = 0;
    if (dateRange) {
      newCustomers = await this.db.customer.count({
        where: {
          ...where,
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
      });
    }

    const activeCustomers = await this.db.customer.count({
      where: {
        ...where,
        isPayingCustomer: true,
      },
    });

    const spendingStats = await this.db.customer.aggregate({
      where,
      _avg: {
        totalSpent: true,
      },
    });

    return {
      totalCustomers,
      newCustomers,
      activeCustomers,
      averageLifetimeValue: Number(spendingStats._avg.totalSpent || 0),
      averageSpending: Number(spendingStats._avg.totalSpent || 0),
      retentionRate: 0, // Would need complex calculation
      churnRate: 0, // Would need complex calculation
    };
  }

  private async getCustomerSegmentation(where: any) {
    const byStatus = await this.db.customer.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
      _avg: {
        totalSpent: true,
      },
    });

    const total = byStatus.reduce((sum, item) => sum + item._count.status, 0);

    return byStatus.map(item => ({
      segment: item.status,
      count: item._count.status,
      percentage: total > 0 ? (item._count.status / total) * 100 : 0,
      averageSpending: Number(item._avg.totalSpent || 0),
      lifetimeValue: Number(item._avg.totalSpent || 0),
    }));
  }

  private async getCustomerPlatformBreakdown(where: any) {
    const result = await this.db.customer.groupBy({
      by: ['platform'],
      where,
      _count: {
        platform: true,
      },
      _avg: {
        totalSpent: true,
      },
    });

    const total = result.reduce((sum, item) => sum + item._count.platform, 0);

    return result.map(item => ({
      platform: item.platform,
      customers: item._count.platform,
      percentage: total > 0 ? (item._count.platform / total) * 100 : 0,
      averageSpending: Number(item._avg.totalSpent || 0),
    }));
  }

  private async getTopCustomers(where: any, limit: number) {
    const customers = await this.db.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        totalSpent: true,
        orderCount: true,
        platform: true,
      },
      orderBy: {
        totalSpent: 'desc',
      },
      take: limit,
    });

    return customers.map(customer => ({
      customerId: customer.id,
      name: customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer',
      totalSpent: Number(customer.totalSpent || 0),
      orderCount: customer.orderCount || 0,
      platform: customer.platform,
    }));
  }

  private async getProductSummary(productWhere: any, orderWhere: any) {
    const totalProducts = await this.db.product.count({ where: productWhere });

    const activeProducts = await this.db.product.count({
      where: {
        ...productWhere,
        status: 'active',
      },
    });

    const revenueStats = await this.db.orderItem.aggregate({
      where: {
        order: orderWhere,
        productId: {
          not: null,
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const priceStats = await this.db.product.aggregate({
      where: productWhere,
      _avg: {
        regularPrice: true,
      },
    });

    const stockStats = await this.db.product.aggregate({
      where: {
        ...productWhere,
        manageStock: true,
      },
      _sum: {
        stockQuantity: true,
      },
    });

    const lowStockCount = await this.db.product.count({
      where: {
        ...productWhere,
        stockQuantity: {
          lt: 10,
        },
      },
    });

    return {
      totalProducts,
      activeProducts,
      totalRevenue: Number(revenueStats._sum.totalPrice || 0),
      averagePrice: Number(priceStats._avg.regularPrice || 0),
      stockValue: Number(stockStats._sum.stockQuantity || 0),
      lowStockCount,
    };
  }

  private async getTopProductsPerformance(orderWhere: any, limit: number) {
    const result = await this.db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: orderWhere,
        productId: {
          not: null,
        },
      },
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      _count: {
        orderId: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productIds = result.map(item => item.productId).filter(Boolean) as string[];
    const products = await this.db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        platform: true,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return result.map(item => {
      const product = productMap.get(item.productId!);
      return {
        productId: item.productId!,
        name: product?.name || 'Unknown Product',
        revenue: Number(item._sum.totalPrice || 0),
        orders: Number(item._sum.quantity || 0),
        conversionRate: 0, // Would need additional data to calculate
        platform: product?.platform || Platform.WOOCOMMERCE,
      };
    });
  }

  private async getCategoryPerformance(orderWhere: any) {
    // This would need a complex join query in production
    const categories = await this.db.category.findMany({
      select: {
        id: true,
        name: true,
        products: {
          select: {
            product: {
              select: {
                id: true,
                regularPrice: true,
              },
            },
          },
        },
      },
    });

    return categories.map(category => ({
      categoryId: category.id,
      name: category.name,
      revenue: 0, // Would need complex calculation
      productCount: category.products.length,
      averagePrice: category.products.reduce((sum, p) => sum + Number(p.product.regularPrice || 0), 0) / category.products.length || 0,
    }));
  }

  private async getProductPlatformBreakdown(productWhere: any) {
    const result = await this.db.product.groupBy({
      by: ['platform'],
      where: productWhere,
      _count: {
        platform: true,
      },
    });

    const total = result.reduce((sum, item) => sum + item._count.platform, 0);

    return result.map(item => ({
      platform: item.platform,
      products: item._count.platform,
      revenue: 0, // Would need additional calculation
      percentage: total > 0 ? (item._count.platform / total) * 100 : 0,
    }));
  }

  private async getStockAnalysis(productWhere: any) {
    const inStock = await this.db.product.count({
      where: {
        ...productWhere,
        stockStatus: 'instock',
      },
    });

    const lowStock = await this.db.product.count({
      where: {
        ...productWhere,
        stockQuantity: {
          lt: 10,
          gt: 0,
        },
      },
    });

    const outOfStock = await this.db.product.count({
      where: {
        ...productWhere,
        stockQuantity: 0,
      },
    });

    const stockValue = await this.db.product.aggregate({
      where: {
        ...productWhere,
        manageStock: true,
      },
      _sum: {
        stockQuantity: true,
      },
    });

    return {
      inStock,
      lowStock,
      outOfStock,
      totalValue: Number(stockValue._sum.stockQuantity || 0),
    };
  }

  private async getWebhookHealth(where: any) {
    const totalWebhooks = await this.db.webhook.count({ where });

    const processedWebhooks = await this.db.webhook.count({
      where: {
        ...where,
        processed: true,
      },
    });

    const failedWebhooks = await this.db.webhook.count({
      where: {
        ...where,
        processed: false,
        errorMessage: {
          not: null,
        },
      },
    });

    const successRate = totalWebhooks > 0 ? (processedWebhooks / totalWebhooks) * 100 : 0;
    const failureRate = totalWebhooks > 0 ? (failedWebhooks / totalWebhooks) * 100 : 0;

    return {
      totalWebhooks,
      successRate,
      averageProcessingTime: 0, // Would need additional tracking
      failureRate,
      retryRate: 0, // Would need additional tracking
    };
  }

  private async getSyncStatus(where: any) {
    const syncLogs = await this.db.syncLog.findMany({
      where,
      orderBy: {
        startedAt: 'desc',
      },
      take: 100,
    });

    const successfulSyncs = syncLogs.filter(log => log.status === 'success').length;
    const failedSyncs = syncLogs.filter(log => log.status === 'error').length;
    const pendingSyncs = syncLogs.filter(log => log.status === 'pending').length;

    const lastSync = syncLogs[0];
    const averageDuration = syncLogs
      .filter(log => log.duration)
      .reduce((sum, log) => sum + (log.duration || 0), 0) / syncLogs.length || 0;

    return {
      lastSyncTime: lastSync?.startedAt.toISOString() || new Date().toISOString(),
      successfulSyncs,
      failedSyncs,
      pendingSyncs,
      averageSyncTime: averageDuration,
    };
  }

  private async getQueueStatus() {
    // This would integrate with Redis or queue system
    // For now, returning mock data
    return {
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };
  }

  private async getDashboardKPIs(where: any) {
    const [orderStats, customerCount, productCount] = await Promise.all([
      this.db.order.aggregate({
        where,
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          total: true,
        },
      }),
      this.db.customer.count({ where }),
      this.db.product.count({ where }),
    ]);

    return {
      totalRevenue: Number(orderStats._sum.total || 0),
      totalOrders: orderStats._count.id,
      totalCustomers: customerCount,
      totalProducts: productCount,
      averageOrderValue: Number(orderStats._avg.total || 0),
      conversionRate: 0, // Would need additional calculation
    };
  }

  private async getRecentActivity(where: any, limit: number) {
    const recentOrders = await this.db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        platform: true,
        createdAt: true,
        customerName: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return recentOrders.map(order => ({
      type: 'order' as const,
      description: `New order ${order.orderNumber || order.id} for $${order.total} from ${order.customerName || 'Unknown Customer'}`,
      timestamp: order.createdAt.toISOString(),
      platform: order.platform,
    }));
  }

  private async getPlatformStatus() {
    const platforms = [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];

    return Promise.all(platforms.map(async (platform) => {
      const lastSync = await this.db.syncLog.findFirst({
        where: { platform },
        orderBy: { startedAt: 'desc' },
      });

      const errorCount = await this.db.syncLog.count({
        where: {
          platform,
          status: 'error',
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      return {
        platform,
        status: (errorCount > 10 ? 'degraded' : 'online') as 'degraded' | 'online' | 'offline',
        lastSync: lastSync?.startedAt.toISOString() || new Date().toISOString(),
        errorCount,
      };
    }));
  }
}
