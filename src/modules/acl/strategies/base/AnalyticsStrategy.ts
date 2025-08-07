/**
 * Base Analytics Strategy
 * Provides common functionality for all platform analytics strategies
 */

import { Platform } from '@prisma/client';
import { IAnalyticsStrategy } from '../interfaces/IAnalyticsStrategy';
import { AnalyticsRepository } from '../../repositories/analytics.repository';
import { createPlatformLogger } from '@/shared/utils/logger';
import {
  AnalyticsContext,
  AnalyticsQueryOptions,
  SalesAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  PerformanceMetrics,
  DashboardSummary
} from '@/shared/types/analytics.types';

/**
 * Abstract base class for analytics strategies
 */
export abstract class BaseAnalyticsStrategy implements IAnalyticsStrategy {
  protected logger = createPlatformLogger('STRATEGY', 'AnalyticsStrategy');
  protected analyticsRepository: AnalyticsRepository;
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Get sales analytics - base implementation
   */
  async getSalesAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<SalesAnalytics>> {
    this.logger.info({
      platform: this.platform,
      context,
      options,
    }, 'Getting sales analytics');

    // Ensure platform filter
    const platformOptions = {
      ...options,
      platform: this.platform,
    };

    const analyticsData = await this.analyticsRepository.getSalesAnalytics(platformOptions);
    
    // Apply platform-specific transformations
    return this.transformSalesData(analyticsData);
  }

  /**
   * Get customer analytics - base implementation
   */
  async getCustomerAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<CustomerAnalytics>> {
    this.logger.info({
      platform: this.platform,
      context,
      options,
    }, 'Getting customer analytics');

    const platformOptions = {
      ...options,
      platform: this.platform,
    };

    const analyticsData = await this.analyticsRepository.getCustomerAnalytics(platformOptions);
    
    return this.transformCustomerData(analyticsData);
  }

  /**
   * Get product analytics - base implementation
   */
  async getProductAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<ProductAnalytics>> {
    this.logger.info({
      platform: this.platform,
      context,
      options,
    }, 'Getting product analytics');

    const platformOptions = {
      ...options,
      platform: this.platform,
    };

    const analyticsData = await this.analyticsRepository.getProductAnalytics(platformOptions);
    
    return this.transformProductData(analyticsData);
  }

  /**
   * Get performance metrics - base implementation
   */
  async getPerformanceMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<PerformanceMetrics>> {
    this.logger.info({
      platform: this.platform,
      context,
      options,
    }, 'Getting performance metrics');

    const platformOptions = {
      ...options,
      platform: this.platform,
    };

    const metricsData = await this.analyticsRepository.getPerformanceMetrics(platformOptions);
    
    return this.transformPerformanceData(metricsData);
  }

  /**
   * Get dashboard summary - base implementation
   */
  async getDashboardSummary(context: AnalyticsContext): Promise<Partial<DashboardSummary>> {
    this.logger.info({
      platform: this.platform,
      context,
    }, 'Getting dashboard summary');

    const options = {
      platform: this.platform,
    };

    const dashboardData = await this.analyticsRepository.getDashboardSummary(options);
    
    return this.transformDashboardData(dashboardData);
  }

  /**
   * Transform raw platform data to analytics format
   */
  async transformPlatformData(
    rawData: any,
    dataType: 'sales' | 'customers' | 'products' | 'performance'
  ): Promise<any> {
    switch (dataType) {
      case 'sales':
        return this.transformSalesData(rawData);
      case 'customers':
        return this.transformCustomerData(rawData);
      case 'products':
        return this.transformProductData(rawData);
      case 'performance':
        return this.transformPerformanceData(rawData);
      default:
        return rawData;
    }
  }

  /**
   * Validate analytics context
   */
  validateContext(context: AnalyticsContext): boolean {
    // Basic validation
    if (context.platform && context.platform !== this.platform) {
      return false;
    }

    if (context.dateRange) {
      if (context.dateRange.startDate > context.dateRange.endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get supported analytics features - base implementation
   */
  getSupportedFeatures(): string[] {
    return [
      'sales_analytics',
      'customer_analytics',
      'product_analytics',
      'performance_metrics',
      'dashboard_summary',
    ];
  }

  /**
   * Abstract methods to be implemented by platform-specific strategies
   */
  abstract getPlatformSpecificMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Record<string, any>>;

  /**
   * Protected transformation methods - can be overridden by platform strategies
   */
  protected transformSalesData(data: Partial<SalesAnalytics>): Partial<SalesAnalytics> {
    return data;
  }

  protected transformCustomerData(data: Partial<CustomerAnalytics>): Partial<CustomerAnalytics> {
    return data;
  }

  protected transformProductData(data: Partial<ProductAnalytics>): Partial<ProductAnalytics> {
    return data;
  }

  protected transformPerformanceData(data: Partial<PerformanceMetrics>): Partial<PerformanceMetrics> {
    return data;
  }

  protected transformDashboardData(data: Partial<DashboardSummary>): Partial<DashboardSummary> {
    return data;
  }

  /**
   * Utility methods for common calculations
   */
  protected calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  protected calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return (part / total) * 100;
  }

  protected formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  protected formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Date utility methods
   */
  protected getDateRange(days: number): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return { startDate, endDate };
  }

  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  protected groupByPeriod(
    data: any[],
    dateField: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key: string;

      switch (period) {
        case 'day':
          key = this.formatDate(date);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = this.formatDate(weekStart);
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = this.formatDate(date);
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }
}
