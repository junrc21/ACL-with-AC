/**
 * Dashboard Data Service
 * Aggregates data from all analytics services for dashboard display
 */

import { Platform } from '@prisma/client';
import { SalesAnalyticsService } from './sales-analytics.service';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { createPlatformLogger } from '@/shared/utils/logger';
import {
  DashboardSummary,
  AnalyticsContext,
  AnalyticsProcessingResult,
  DashboardKPIs,
  RecentActivityData,
  AlertData,
  PlatformStatusData
} from '@/shared/types/analytics.types';

/**
 * Service class for dashboard data aggregation
 */
export class DashboardDataService {
  private logger = createPlatformLogger('SERVICE', 'DashboardDataService');
  private salesAnalyticsService: SalesAnalyticsService;
  private customerAnalyticsService: CustomerAnalyticsService;
  private productAnalyticsService: ProductAnalyticsService;
  private performanceMonitoringService: PerformanceMonitoringService;

  constructor() {
    this.salesAnalyticsService = new SalesAnalyticsService();
    this.customerAnalyticsService = new CustomerAnalyticsService();
    this.productAnalyticsService = new ProductAnalyticsService();
    this.performanceMonitoringService = new PerformanceMonitoringService();
  }

  /**
   * Get complete dashboard summary
   */
  async getDashboardSummary(
    context: AnalyticsContext
  ): Promise<AnalyticsProcessingResult<DashboardSummary>> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting dashboard summary');

      // Get data from all services in parallel
      const [
        salesResult,
        customerResult,
        productResult,
        performanceResult
      ] = await Promise.all([
        this.salesAnalyticsService.getSalesAnalytics(context),
        this.customerAnalyticsService.getCustomerAnalytics(context),
        this.productAnalyticsService.getProductAnalytics(context),
        this.performanceMonitoringService.getPerformanceMetrics(context),
      ]);

      // Calculate KPIs
      const kpis = this.calculateKPIs(salesResult, customerResult, productResult);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(context);

      // Get system alerts
      const alerts = await this.getSystemAlerts(context, performanceResult);

      // Get platform status
      const platformStatus = await this.getPlatformStatus(context, performanceResult);

      const dashboardSummary: DashboardSummary = {
        kpis,
        recentActivity,
        alerts,
        platformStatus,
      };

      const processingTime = Date.now() - startTime;

      this.logger.info({
        platform: context.platform,
        processingTime,
      }, 'Dashboard summary completed');

      return {
        success: true,
        data: dashboardSummary,
        processingTime,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get dashboard summary');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get real-time KPIs
   */
  async getRealTimeKPIs(
    context: AnalyticsContext
  ): Promise<AnalyticsProcessingResult<DashboardKPIs>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting real-time KPIs');

      // Get latest data with short time range for real-time feel
      const realtimeContext = {
        ...context,
        dateRange: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          endDate: new Date(),
        },
      };

      const [salesResult, customerResult, productResult] = await Promise.all([
        this.salesAnalyticsService.getSalesAnalytics(realtimeContext),
        this.customerAnalyticsService.getCustomerAnalytics(realtimeContext),
        this.productAnalyticsService.getProductAnalytics(realtimeContext),
      ]);

      const kpis = this.calculateKPIs(salesResult, customerResult, productResult);

      return {
        success: true,
        data: kpis,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get real-time KPIs');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get platform comparison data
   */
  async getPlatformComparison(
    context: AnalyticsContext
  ): Promise<AnalyticsProcessingResult<any>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting platform comparison');

      const platforms = [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
      
      const platformData = await Promise.all(
        platforms.map(async (platform) => {
          const platformContext = { ...context, platform };
          
          const [salesResult, customerResult, productResult] = await Promise.all([
            this.salesAnalyticsService.getSalesAnalytics(platformContext),
            this.customerAnalyticsService.getCustomerAnalytics(platformContext),
            this.productAnalyticsService.getProductAnalytics(platformContext),
          ]);

          return {
            platform,
            sales: salesResult.data?.summary,
            customers: customerResult.data?.summary,
            products: productResult.data?.summary,
          };
        })
      );

      return {
        success: true,
        data: platformData,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get platform comparison');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get trending metrics
   */
  async getTrendingMetrics(
    context: AnalyticsContext
  ): Promise<AnalyticsProcessingResult<any>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting trending metrics');

      // Get trends for the last 30 days
      const trendContext = {
        ...context,
        dateRange: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
      };

      const salesTrends = await this.salesAnalyticsService.getSalesTrends(trendContext);

      return {
        success: true,
        data: {
          sales: salesTrends.data,
          topGrowingProducts: await this.getTopGrowingProducts(trendContext),
          topGrowingCustomers: await this.getTopGrowingCustomers(trendContext),
        },
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get trending metrics');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Private helper methods
   */
  private calculateKPIs(
    salesResult: any,
    customerResult: any,
    productResult: any
  ): DashboardKPIs {
    return {
      totalRevenue: salesResult.data?.summary?.totalRevenue || 0,
      totalOrders: salesResult.data?.summary?.totalOrders || 0,
      totalCustomers: customerResult.data?.summary?.totalCustomers || 0,
      totalProducts: productResult.data?.summary?.totalProducts || 0,
      averageOrderValue: salesResult.data?.summary?.averageOrderValue || 0,
      conversionRate: salesResult.data?.summary?.conversionRate || 0,
    };
  }

  private async getRecentActivity(context: AnalyticsContext): Promise<RecentActivityData[]> {
    // This would query recent orders, customers, products, etc.
    // For now, returning mock data
    return [
      {
        type: 'order',
        description: 'New order #12345 for $299.99',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        platform: Platform.WOOCOMMERCE,
      },
      {
        type: 'customer',
        description: 'New customer registration: john@example.com',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        platform: Platform.NUVEMSHOP,
      },
      {
        type: 'product',
        description: 'Product "Digital Course" updated',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        platform: Platform.HOTMART,
      },
      {
        type: 'webhook',
        description: 'Webhook processed successfully',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        platform: Platform.WOOCOMMERCE,
      },
    ];
  }

  private async getSystemAlerts(
    context: AnalyticsContext,
    performanceResult: any
  ): Promise<AlertData[]> {
    const alerts: AlertData[] = [];

    // Check performance metrics for alerts
    if (performanceResult.success && performanceResult.data) {
      const performance = performanceResult.data;

      // Webhook health alerts
      if (performance.webhookHealth?.failureRate > 10) {
        alerts.push({
          type: 'warning',
          message: `High webhook failure rate: ${performance.webhookHealth.failureRate.toFixed(2)}%`,
          timestamp: new Date().toISOString(),
          platform: context.platform,
        });
      }

      // Sync status alerts
      if (performance.syncStatus?.failedSyncs > 5) {
        alerts.push({
          type: 'error',
          message: `Multiple sync failures: ${performance.syncStatus.failedSyncs} failed syncs`,
          timestamp: new Date().toISOString(),
          platform: context.platform,
        });
      }

      // Queue status alerts
      if (performance.queueStatus?.failedJobs > 10) {
        alerts.push({
          type: 'warning',
          message: `High number of failed jobs: ${performance.queueStatus.failedJobs}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }

  private async getPlatformStatus(
    context: AnalyticsContext,
    performanceResult: any
  ): Promise<PlatformStatusData[]> {
    if (performanceResult.success && performanceResult.data?.platformHealth) {
      return performanceResult.data.platformHealth.map((health: any) => ({
        platform: health.platform,
        status: health.status === 'healthy' ? 'online' : health.status === 'degraded' ? 'degraded' : 'offline',
        lastSync: health.lastCheck,
        errorCount: health.errorRate,
      }));
    }

    // Default status for all platforms
    return [
      {
        platform: Platform.HOTMART,
        status: 'online' as const,
        lastSync: new Date().toISOString(),
        errorCount: 0,
      },
      {
        platform: Platform.NUVEMSHOP,
        status: 'online' as const,
        lastSync: new Date().toISOString(),
        errorCount: 0,
      },
      {
        platform: Platform.WOOCOMMERCE,
        status: 'online' as const,
        lastSync: new Date().toISOString(),
        errorCount: 0,
      },
    ];
  }

  private async getTopGrowingProducts(context: AnalyticsContext): Promise<any[]> {
    // This would calculate product growth rates
    return [];
  }

  private async getTopGrowingCustomers(context: AnalyticsContext): Promise<any[]> {
    // This would calculate customer growth rates
    return [];
  }
}
