/**
 * Analytics Strategy Interface
 * Defines the contract for platform-specific analytics implementations
 */

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
 * Interface for platform-specific analytics strategies
 */
export interface IAnalyticsStrategy {
  /**
   * Get sales analytics for the platform
   */
  getSalesAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<SalesAnalytics>>;

  /**
   * Get customer analytics for the platform
   */
  getCustomerAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<CustomerAnalytics>>;

  /**
   * Get product analytics for the platform
   */
  getProductAnalytics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<ProductAnalytics>>;

  /**
   * Get performance metrics for the platform
   */
  getPerformanceMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Partial<PerformanceMetrics>>;

  /**
   * Get dashboard summary for the platform
   */
  getDashboardSummary(
    context: AnalyticsContext
  ): Promise<Partial<DashboardSummary>>;

  /**
   * Get platform-specific metrics
   */
  getPlatformSpecificMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<Record<string, any>>;

  /**
   * Transform raw platform data to analytics format
   */
  transformPlatformData(
    rawData: any,
    dataType: 'sales' | 'customers' | 'products' | 'performance'
  ): Promise<any>;

  /**
   * Validate platform-specific analytics context
   */
  validateContext(context: AnalyticsContext): boolean;

  /**
   * Get supported analytics features for the platform
   */
  getSupportedFeatures(): string[];
}
