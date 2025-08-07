/**
 * Analytics Controller for handling analytics API endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '@/middlewares/error.middleware';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { createPlatformLogger } from '@/shared/utils/logger';
import { SalesAnalyticsService } from '../services/sales-analytics.service';
import { CustomerAnalyticsService } from '../services/customer-analytics.service';
import { ProductAnalyticsService } from '../services/product-analytics.service';
import {
  SalesAnalyticsRequestSchema,
  CustomerAnalyticsRequestSchema,
  ProductAnalyticsRequestSchema,
  PerformanceMetricsRequestSchema,
  DashboardSummaryResponseSchema
} from '../dto/analytics.dto';
import { AnalyticsContext, AnalyticsQueryOptions } from '@/shared/types/analytics.types';
import { Platform } from '@prisma/client';

/**
 * Analytics controller class
 */
export class AnalyticsController {
  private logger = createPlatformLogger('CONTROLLER', 'AnalyticsController');
  private salesAnalyticsService: SalesAnalyticsService;
  private customerAnalyticsService: CustomerAnalyticsService;
  private productAnalyticsService: ProductAnalyticsService;

  constructor() {
    this.salesAnalyticsService = new SalesAnalyticsService();
    this.customerAnalyticsService = new CustomerAnalyticsService();
    this.productAnalyticsService = new ProductAnalyticsService();
  }

  /**
   * GET /api/acl/analytics/sales
   * Get sales analytics data
   */
  getSalesAnalytics = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting sales analytics');

    // Validate request
    const validatedQuery = SalesAnalyticsRequestSchema.parse(req.query);

    // Build context
    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    // Build options
    const options: AnalyticsQueryOptions = {
      groupBy: validatedQuery.groupBy,
      limit: 50, // Default limit for API responses
    };

    // Get analytics data
    const result = await this.salesAnalyticsService.getSalesAnalytics(context, options);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get sales analytics');
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        processingTime: result.processingTime,
        cacheHit: result.cacheHit,
        platform: context.platform,
        dateRange: context.dateRange,
      },
    });
  });

  /**
   * GET /api/acl/analytics/sales/trends
   * Get sales trends data
   */
  getSalesTrends = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting sales trends');

    const validatedQuery = SalesAnalyticsRequestSchema.parse(req.query);

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const result = await this.salesAnalyticsService.getSalesTrends(context);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get sales trends');
    }

    res.json({
      success: true,
      data: result.data,
    });
  });

  /**
   * GET /api/acl/analytics/customers
   * Get customer analytics data
   */
  getCustomerAnalytics = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting customer analytics');

    const validatedQuery = CustomerAnalyticsRequestSchema.parse(req.query);

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const options: AnalyticsQueryOptions = {
      limit: 50,
    };

    const result = await this.customerAnalyticsService.getCustomerAnalytics(context, options);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get customer analytics');
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        processingTime: result.processingTime,
        platform: context.platform,
        dateRange: context.dateRange,
      },
    });
  });

  /**
   * GET /api/acl/analytics/customers/segmentation
   * Get customer segmentation data
   */
  getCustomerSegmentation = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting customer segmentation');

    const validatedQuery = CustomerAnalyticsRequestSchema.parse(req.query);
    const segmentBy = (req.query.segmentBy as string) || 'status';

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const result = await this.customerAnalyticsService.getCustomerSegmentation(
      context,
      segmentBy as any
    );

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get customer segmentation');
    }

    res.json({
      success: true,
      data: result.data,
    });
  });

  /**
   * GET /api/acl/analytics/products
   * Get product analytics data
   */
  getProductAnalytics = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting product analytics');

    const validatedQuery = ProductAnalyticsRequestSchema.parse(req.query);

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const options: AnalyticsQueryOptions = {
      limit: validatedQuery.limit,
    };

    const result = await this.productAnalyticsService.getProductAnalytics(context, options);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get product analytics');
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        processingTime: result.processingTime,
        platform: context.platform,
        dateRange: context.dateRange,
      },
    });
  });

  /**
   * GET /api/acl/analytics/products/top
   * Get top performing products
   */
  getTopProducts = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting top products');

    const validatedQuery = ProductAnalyticsRequestSchema.parse(req.query);

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const options: AnalyticsQueryOptions = {
      limit: validatedQuery.limit,
    };

    const result = await this.productAnalyticsService.getTopPerformingProducts(context, options);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get top products');
    }

    res.json({
      success: true,
      data: result.data,
    });
  });

  /**
   * GET /api/acl/analytics/products/categories
   * Get category performance data
   */
  getCategoryPerformance = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting category performance');

    const validatedQuery = ProductAnalyticsRequestSchema.parse(req.query);

    const context: AnalyticsContext = {
      platform: validatedQuery.platform || req.platform,
      storeId: validatedQuery.storeId || req.storeId,
      dateRange: validatedQuery.dateRange ? {
        startDate: validatedQuery.dateRange.startDate!,
        endDate: validatedQuery.dateRange.endDate!
      } : undefined,
      timezone: validatedQuery.timezone,
    };

    const result = await this.productAnalyticsService.getCategoryPerformance(context);

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to get category performance');
    }

    res.json({
      success: true,
      data: result.data,
    });
  });

  /**
   * GET /api/acl/analytics/dashboard
   * Get dashboard summary data
   */
  getDashboardSummary = asyncHandler(async (req: any, res: Response) => {
    this.logger.info({
      platform: req.platform,
      query: req.query,
    }, 'Getting dashboard summary');

    const context: AnalyticsContext = {
      platform: req.platform,
      storeId: req.storeId,
      timezone: 'UTC',
    };

    // Get data from all services
    const [salesResult, customerResult, productResult] = await Promise.all([
      this.salesAnalyticsService.getSalesAnalytics(context),
      this.customerAnalyticsService.getCustomerAnalytics(context),
      this.productAnalyticsService.getProductAnalytics(context),
    ]);

    // Build dashboard summary
    const dashboardData = {
      kpis: {
        totalRevenue: salesResult.data?.summary.totalRevenue || 0,
        totalOrders: salesResult.data?.summary.totalOrders || 0,
        totalCustomers: customerResult.data?.summary.totalCustomers || 0,
        totalProducts: productResult.data?.summary.totalProducts || 0,
        averageOrderValue: salesResult.data?.summary.averageOrderValue || 0,
        conversionRate: salesResult.data?.summary.conversionRate || 0,
      },
      recentActivity: [], // Would be populated from recent orders/activities
      alerts: [], // Would be populated from system alerts
      platformStatus: [], // Would be populated from platform health checks
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  });
}

// Create and export controller instance
export const analyticsController = new AnalyticsController();
