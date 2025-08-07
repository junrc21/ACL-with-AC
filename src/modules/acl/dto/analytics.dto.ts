/**
 * Analytics Data Transfer Objects (DTOs) for API validation
 */

import { z } from 'zod';
import { Platform } from '@prisma/client';

/**
 * Date range schema for analytics queries
 */
export const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  }
);

/**
 * Base analytics request schema
 */
export const BaseAnalyticsRequestSchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
  timezone: z.string().default('UTC'),
});

/**
 * Sales analytics request schema
 */
export const SalesAnalyticsRequestSchema = BaseAnalyticsRequestSchema.extend({
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
  metrics: z.array(z.enum([
    'revenue',
    'orders',
    'averageOrderValue',
    'refunds',
    'commissions',
    'conversionRate'
  ])).default(['revenue', 'orders']),
  includeComparisons: z.boolean().default(false),
  includeTrends: z.boolean().default(true),
});

/**
 * Customer analytics request schema
 */
export const CustomerAnalyticsRequestSchema = BaseAnalyticsRequestSchema.extend({
  segmentBy: z.enum(['status', 'role', 'platform', 'spending']).optional(),
  metrics: z.array(z.enum([
    'totalCustomers',
    'newCustomers',
    'activeCustomers',
    'lifetimeValue',
    'averageSpending',
    'retentionRate',
    'churnRate'
  ])).default(['totalCustomers', 'newCustomers']),
  includeSegmentation: z.boolean().default(true),
});

/**
 * Product analytics request schema
 */
export const ProductAnalyticsRequestSchema = BaseAnalyticsRequestSchema.extend({
  categoryId: z.string().optional(),
  productType: z.string().optional(),
  metrics: z.array(z.enum([
    'totalProducts',
    'topSelling',
    'revenue',
    'stockLevels',
    'categoryPerformance',
    'conversionRates'
  ])).default(['totalProducts', 'topSelling']),
  limit: z.number().min(1).max(100).default(10),
  includeVariants: z.boolean().default(false),
});

/**
 * Performance monitoring request schema
 */
export const PerformanceMetricsRequestSchema = BaseAnalyticsRequestSchema.extend({
  metrics: z.array(z.enum([
    'webhookHealth',
    'syncStatus',
    'apiResponseTimes',
    'errorRates',
    'queueStatus',
    'systemLoad'
  ])).default(['webhookHealth', 'syncStatus']),
  includeDetails: z.boolean().default(false),
});

/**
 * Sales analytics response schema
 */
export const SalesAnalyticsResponseSchema = z.object({
  summary: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    averageOrderValue: z.number(),
    totalRefunds: z.number(),
    refundRate: z.number(),
    conversionRate: z.number().optional(),
    growthRate: z.number().optional(),
  }),
  timeSeries: z.array(z.object({
    date: z.string(),
    revenue: z.number(),
    orders: z.number(),
    averageOrderValue: z.number(),
    refunds: z.number(),
    commissions: z.number().optional(),
  })),
  platformBreakdown: z.array(z.object({
    platform: z.nativeEnum(Platform),
    revenue: z.number(),
    orders: z.number(),
    percentage: z.number(),
  })),
  topProducts: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    revenue: z.number(),
    orders: z.number(),
    platform: z.nativeEnum(Platform),
  })).optional(),
  trends: z.object({
    revenueGrowth: z.number(),
    orderGrowth: z.number(),
    aovGrowth: z.number(),
  }).optional(),
});

/**
 * Customer analytics response schema
 */
export const CustomerAnalyticsResponseSchema = z.object({
  summary: z.object({
    totalCustomers: z.number(),
    newCustomers: z.number(),
    activeCustomers: z.number(),
    averageLifetimeValue: z.number(),
    averageSpending: z.number(),
    retentionRate: z.number(),
    churnRate: z.number(),
  }),
  segmentation: z.array(z.object({
    segment: z.string(),
    count: z.number(),
    percentage: z.number(),
    averageSpending: z.number(),
    lifetimeValue: z.number(),
  })),
  platformBreakdown: z.array(z.object({
    platform: z.nativeEnum(Platform),
    customers: z.number(),
    percentage: z.number(),
    averageSpending: z.number(),
  })),
  cohortAnalysis: z.array(z.object({
    cohort: z.string(),
    size: z.number(),
    retentionRates: z.array(z.number()),
  })).optional(),
  topCustomers: z.array(z.object({
    customerId: z.string(),
    name: z.string(),
    totalSpent: z.number(),
    orderCount: z.number(),
    platform: z.nativeEnum(Platform),
  })).optional(),
});

/**
 * Product analytics response schema
 */
export const ProductAnalyticsResponseSchema = z.object({
  summary: z.object({
    totalProducts: z.number(),
    activeProducts: z.number(),
    totalRevenue: z.number(),
    averagePrice: z.number(),
    stockValue: z.number(),
    lowStockCount: z.number(),
  }),
  topProducts: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    revenue: z.number(),
    orders: z.number(),
    conversionRate: z.number(),
    platform: z.nativeEnum(Platform),
  })),
  categoryPerformance: z.array(z.object({
    categoryId: z.string(),
    name: z.string(),
    revenue: z.number(),
    productCount: z.number(),
    averagePrice: z.number(),
  })),
  platformBreakdown: z.array(z.object({
    platform: z.nativeEnum(Platform),
    products: z.number(),
    revenue: z.number(),
    percentage: z.number(),
  })),
  stockAnalysis: z.object({
    inStock: z.number(),
    lowStock: z.number(),
    outOfStock: z.number(),
    totalValue: z.number(),
  }),
});

/**
 * Performance metrics response schema
 */
export const PerformanceMetricsResponseSchema = z.object({
  webhookHealth: z.object({
    totalWebhooks: z.number(),
    successRate: z.number(),
    averageProcessingTime: z.number(),
    failureRate: z.number(),
    retryRate: z.number(),
  }),
  syncStatus: z.object({
    lastSyncTime: z.string(),
    successfulSyncs: z.number(),
    failedSyncs: z.number(),
    pendingSyncs: z.number(),
    averageSyncTime: z.number(),
  }),
  apiMetrics: z.object({
    totalRequests: z.number(),
    averageResponseTime: z.number(),
    errorRate: z.number(),
    successRate: z.number(),
  }),
  queueStatus: z.object({
    pendingJobs: z.number(),
    processingJobs: z.number(),
    completedJobs: z.number(),
    failedJobs: z.number(),
  }),
  platformHealth: z.array(z.object({
    platform: z.nativeEnum(Platform),
    status: z.enum(['healthy', 'degraded', 'down']),
    lastCheck: z.string(),
    responseTime: z.number(),
    errorRate: z.number(),
  })),
});

/**
 * Dashboard summary response schema
 */
export const DashboardSummaryResponseSchema = z.object({
  kpis: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    totalCustomers: z.number(),
    totalProducts: z.number(),
    averageOrderValue: z.number(),
    conversionRate: z.number(),
  }),
  recentActivity: z.array(z.object({
    type: z.enum(['order', 'customer', 'product', 'webhook']),
    description: z.string(),
    timestamp: z.string(),
    platform: z.nativeEnum(Platform),
  })),
  alerts: z.array(z.object({
    type: z.enum(['warning', 'error', 'info']),
    message: z.string(),
    timestamp: z.string(),
    platform: z.nativeEnum(Platform).optional(),
  })),
  platformStatus: z.array(z.object({
    platform: z.nativeEnum(Platform),
    status: z.enum(['online', 'offline', 'degraded']),
    lastSync: z.string(),
    errorCount: z.number(),
  })),
});

// Export types for use in controllers and services
export type DateRangeDto = z.infer<typeof DateRangeSchema>;
export type SalesAnalyticsRequestDto = z.infer<typeof SalesAnalyticsRequestSchema>;
export type CustomerAnalyticsRequestDto = z.infer<typeof CustomerAnalyticsRequestSchema>;
export type ProductAnalyticsRequestDto = z.infer<typeof ProductAnalyticsRequestSchema>;
export type PerformanceMetricsRequestDto = z.infer<typeof PerformanceMetricsRequestSchema>;
export type SalesAnalyticsResponseDto = z.infer<typeof SalesAnalyticsResponseSchema>;
export type CustomerAnalyticsResponseDto = z.infer<typeof CustomerAnalyticsResponseSchema>;
export type ProductAnalyticsResponseDto = z.infer<typeof ProductAnalyticsResponseSchema>;
export type PerformanceMetricsResponseDto = z.infer<typeof PerformanceMetricsResponseSchema>;
export type DashboardSummaryResponseDto = z.infer<typeof DashboardSummaryResponseSchema>;
