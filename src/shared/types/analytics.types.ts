/**
 * Analytics types and interfaces
 */

import { Platform } from '@prisma/client';

/**
 * Date range interface
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Analytics context for strategy pattern
 */
export interface AnalyticsContext {
  platform?: Platform;
  storeId?: string;
  dateRange?: DateRange;
  timezone: string;
}

/**
 * Sales analytics data
 */
export interface SalesAnalytics {
  summary: SalesSummary;
  timeSeries: SalesTimeSeriesData[];
  platformBreakdown: PlatformSalesData[];
  topProducts?: TopProductData[];
  trends?: SalesTrends;
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRefunds: number;
  refundRate: number;
  conversionRate?: number;
  growthRate?: number;
}

export interface SalesTimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  refunds: number;
  commissions?: number;
}

export interface PlatformSalesData {
  platform: Platform;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface TopProductData {
  productId: string;
  name: string;
  revenue: number;
  orders: number;
  platform: Platform;
}

export interface SalesTrends {
  revenueGrowth: number;
  orderGrowth: number;
  aovGrowth: number;
}

/**
 * Customer analytics data
 */
export interface CustomerAnalytics {
  summary: CustomerSummary;
  segmentation: CustomerSegmentData[];
  platformBreakdown: PlatformCustomerData[];
  cohortAnalysis?: CohortData[];
  topCustomers?: TopCustomerData[];
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  averageLifetimeValue: number;
  averageSpending: number;
  retentionRate: number;
  churnRate: number;
}

export interface CustomerSegmentData {
  segment: string;
  count: number;
  percentage: number;
  averageSpending: number;
  lifetimeValue: number;
}

export interface PlatformCustomerData {
  platform: Platform;
  customers: number;
  percentage: number;
  averageSpending: number;
}

export interface CohortData {
  cohort: string;
  size: number;
  retentionRates: number[];
}

export interface TopCustomerData {
  customerId: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  platform: Platform;
}

/**
 * Product analytics data
 */
export interface ProductAnalytics {
  summary: ProductSummary;
  topProducts: TopProductPerformanceData[];
  categoryPerformance: CategoryPerformanceData[];
  platformBreakdown: PlatformProductData[];
  stockAnalysis: StockAnalysisData;
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  totalRevenue: number;
  averagePrice: number;
  stockValue: number;
  lowStockCount: number;
}

export interface TopProductPerformanceData {
  productId: string;
  name: string;
  revenue: number;
  orders: number;
  conversionRate: number;
  platform: Platform;
}

export interface CategoryPerformanceData {
  categoryId: string;
  name: string;
  revenue: number;
  productCount: number;
  averagePrice: number;
}

export interface PlatformProductData {
  platform: Platform;
  products: number;
  revenue: number;
  percentage: number;
}

export interface StockAnalysisData {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

/**
 * Performance metrics data
 */
export interface PerformanceMetrics {
  webhookHealth: WebhookHealthData;
  syncStatus: SyncStatusData;
  apiMetrics: ApiMetricsData;
  queueStatus: QueueStatusData;
  platformHealth: PlatformHealthData[];
}

export interface WebhookHealthData {
  totalWebhooks: number;
  successRate: number;
  averageProcessingTime: number;
  failureRate: number;
  retryRate: number;
}

export interface SyncStatusData {
  lastSyncTime: string;
  successfulSyncs: number;
  failedSyncs: number;
  pendingSyncs: number;
  averageSyncTime: number;
}

export interface ApiMetricsData {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
}

export interface QueueStatusData {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface PlatformHealthData {
  platform: Platform;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
}

/**
 * Dashboard summary data
 */
export interface DashboardSummary {
  kpis: DashboardKPIs;
  recentActivity: RecentActivityData[];
  alerts: AlertData[];
  platformStatus: PlatformStatusData[];
}

export interface DashboardKPIs {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface RecentActivityData {
  type: 'order' | 'customer' | 'product' | 'webhook';
  description: string;
  timestamp: string;
  platform: Platform;
}

export interface AlertData {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  platform?: Platform;
}

export interface PlatformStatusData {
  platform: Platform;
  status: 'online' | 'offline' | 'degraded';
  lastSync: string;
  errorCount: number;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  platform?: Platform;
  storeId?: string;
  dateRange?: DateRange;
  timezone?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  limit?: number;
  offset?: number;
}

/**
 * Analytics processing result
 */
export interface AnalyticsProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
  cacheHit?: boolean;
}

/**
 * Analytics strategy interface
 */
export interface AnalyticsStrategy {
  getSalesAnalytics(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<SalesAnalytics>;
  getCustomerAnalytics(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<CustomerAnalytics>;
  getProductAnalytics(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<ProductAnalytics>;
  getPerformanceMetrics(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<PerformanceMetrics>;
  getDashboardSummary(context: AnalyticsContext): Promise<DashboardSummary>;
}

/**
 * Analytics cache configuration
 */
export interface AnalyticsCacheConfig {
  ttl: number; // Time to live in seconds
  key: string;
  tags: string[];
}

/**
 * Analytics aggregation types
 */
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type MetricType = 'revenue' | 'orders' | 'customers' | 'products' | 'performance';
