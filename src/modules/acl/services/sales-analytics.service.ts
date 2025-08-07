/**
 * Sales Analytics Service for business logic and data processing
 */

import { Platform } from '@prisma/client';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { createPlatformLogger } from '@/shared/utils/logger';
import {
  SalesAnalytics,
  AnalyticsContext,
  AnalyticsQueryOptions,
  AnalyticsProcessingResult,
  SalesTrends,
  DateRange
} from '@/shared/types/analytics.types';

/**
 * Service class for sales analytics business logic
 */
export class SalesAnalyticsService {
  private logger = createPlatformLogger('SERVICE', 'SalesAnalyticsService');
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Get comprehensive sales analytics
   */
  async getSalesAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<SalesAnalytics>> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        platform: context.platform,
        storeId: context.storeId,
        dateRange: context.dateRange,
      }, 'Getting sales analytics');

      // Merge context and options
      const queryOptions: AnalyticsQueryOptions = {
        platform: context.platform,
        storeId: context.storeId,
        dateRange: context.dateRange,
        ...options,
      };

      // Get base analytics data
      const analyticsData = await this.analyticsRepository.getSalesAnalytics(queryOptions);

      // Calculate trends if requested
      let trends: SalesTrends | undefined;
      if (options.groupBy && context.dateRange) {
        trends = await this.calculateSalesTrends(context, queryOptions);
      }

      // Build complete analytics response
      const salesAnalytics: SalesAnalytics = {
        summary: analyticsData.summary || {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalRefunds: 0,
          refundRate: 0,
        },
        timeSeries: analyticsData.timeSeries || [],
        platformBreakdown: analyticsData.platformBreakdown || [],
        topProducts: analyticsData.topProducts,
        trends,
      };

      // Calculate additional metrics
      salesAnalytics.summary.conversionRate = await this.calculateConversionRate(queryOptions);
      salesAnalytics.summary.growthRate = await this.calculateGrowthRate(context, queryOptions);

      const processingTime = Date.now() - startTime;

      this.logger.info({
        platform: context.platform,
        processingTime,
        recordCount: salesAnalytics.timeSeries.length,
      }, 'Sales analytics completed');

      return {
        success: true,
        data: salesAnalytics,
        processingTime,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get sales analytics');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get sales trends comparison
   */
  async getSalesTrends(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<SalesTrends>> {
    try {
      this.logger.info({
        platform: context.platform,
        dateRange: context.dateRange,
      }, 'Calculating sales trends');

      const trends = await this.calculateSalesTrends(context, options);

      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to calculate sales trends');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get revenue breakdown by platform
   */
  async getRevenuePlatformBreakdown(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<any[]>> {
    try {
      this.logger.info({
        platform: context.platform,
        dateRange: context.dateRange,
      }, 'Getting revenue platform breakdown');

      const queryOptions: AnalyticsQueryOptions = {
        platform: context.platform,
        storeId: context.storeId,
        dateRange: context.dateRange,
        ...options,
      };

      const analyticsData = await this.analyticsRepository.getSalesAnalytics(queryOptions);
      
      // Enhance platform breakdown with additional metrics
      const enhancedBreakdown = await Promise.all(
        (analyticsData.platformBreakdown || []).map(async (platform) => {
          const platformOptions = { ...queryOptions, platform: platform.platform };
          const platformAnalytics = await this.analyticsRepository.getSalesAnalytics(platformOptions);
          
          return {
            ...platform,
            averageOrderValue: platformAnalytics.summary?.averageOrderValue || 0,
            refundRate: platformAnalytics.summary?.refundRate || 0,
            growthRate: await this.calculateGrowthRate(
              { ...context, platform: platform.platform },
              platformOptions
            ),
          };
        })
      );

      return {
        success: true,
        data: enhancedBreakdown,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get revenue platform breakdown');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get top performing products
   */
  async getTopProducts(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<any[]>> {
    try {
      this.logger.info({
        platform: context.platform,
        limit: options.limit || 10,
      }, 'Getting top performing products');

      const queryOptions: AnalyticsQueryOptions = {
        platform: context.platform,
        storeId: context.storeId,
        dateRange: context.dateRange,
        limit: options.limit || 10,
        ...options,
      };

      const analyticsData = await this.analyticsRepository.getSalesAnalytics(queryOptions);
      
      return {
        success: true,
        data: analyticsData.topProducts || [],
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get top products');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Private helper methods
   */
  private async calculateSalesTrends(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<SalesTrends> {
    if (!context.dateRange) {
      return {
        revenueGrowth: 0,
        orderGrowth: 0,
        aovGrowth: 0,
      };
    }

    // Calculate previous period for comparison
    const periodLength = context.dateRange.endDate.getTime() - context.dateRange.startDate.getTime();
    const previousPeriod: DateRange = {
      startDate: new Date(context.dateRange.startDate.getTime() - periodLength),
      endDate: new Date(context.dateRange.startDate.getTime() - 1),
    };

    // Get current period data
    const currentData = await this.analyticsRepository.getSalesAnalytics(options);
    
    // Get previous period data
    const previousOptions = { ...options, dateRange: previousPeriod };
    const previousData = await this.analyticsRepository.getSalesAnalytics(previousOptions);

    // Calculate growth rates
    const currentRevenue = currentData.summary?.totalRevenue || 0;
    const previousRevenue = previousData.summary?.totalRevenue || 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentOrders = currentData.summary?.totalOrders || 0;
    const previousOrders = previousData.summary?.totalOrders || 0;
    const orderGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

    const currentAOV = currentData.summary?.averageOrderValue || 0;
    const previousAOV = previousData.summary?.averageOrderValue || 0;
    const aovGrowth = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;

    return {
      revenueGrowth,
      orderGrowth,
      aovGrowth,
    };
  }

  private async calculateConversionRate(options: AnalyticsQueryOptions): Promise<number> {
    // This would need additional data about website visits or product views
    // For now, returning a placeholder
    return 0;
  }

  private async calculateGrowthRate(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<number> {
    if (!context.dateRange) {
      return 0;
    }

    const trends = await this.calculateSalesTrends(context, options);
    return trends.revenueGrowth;
  }

  /**
   * Validate analytics context
   */
  private validateContext(context: AnalyticsContext): void {
    if (context.dateRange) {
      if (context.dateRange.startDate > context.dateRange.endDate) {
        throw new Error('Start date must be before end date');
      }
      
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      const rangeLength = context.dateRange.endDate.getTime() - context.dateRange.startDate.getTime();
      
      if (rangeLength > maxRange) {
        throw new Error('Date range cannot exceed 1 year');
      }
    }
  }
}
