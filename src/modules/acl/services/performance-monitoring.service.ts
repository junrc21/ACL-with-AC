/**
 * Performance Monitoring Service
 * Monitors system performance, health, and operational metrics
 */

import { Platform } from '@prisma/client';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { createPlatformLogger } from '@/shared/utils/logger';
import {
  PerformanceMetrics,
  AnalyticsContext,
  AnalyticsQueryOptions,
  AnalyticsProcessingResult,
  WebhookHealthData,
  SyncStatusData,
  ApiMetricsData,
  QueueStatusData,
  PlatformHealthData
} from '@/shared/types/analytics.types';

/**
 * Service class for performance monitoring
 */
export class PerformanceMonitoringService {
  private logger = createPlatformLogger('SERVICE', 'PerformanceMonitoringService');
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<PerformanceMetrics>> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        platform: context.platform,
        dateRange: context.dateRange,
      }, 'Getting performance metrics');

      // Get base performance data
      const performanceData = await this.analyticsRepository.getPerformanceMetrics(options);

      // Get additional metrics
      const [apiMetrics, platformHealth] = await Promise.all([
        this.getApiMetrics(context, options),
        this.getPlatformHealth(context),
      ]);

      // Build complete performance metrics
      const metrics: PerformanceMetrics = {
        webhookHealth: performanceData.webhookHealth || this.getDefaultWebhookHealth(),
        syncStatus: performanceData.syncStatus || this.getDefaultSyncStatus(),
        apiMetrics: apiMetrics,
        queueStatus: performanceData.queueStatus || this.getDefaultQueueStatus(),
        platformHealth: platformHealth,
      };

      const processingTime = Date.now() - startTime;

      this.logger.info({
        platform: context.platform,
        processingTime,
      }, 'Performance metrics completed');

      return {
        success: true,
        data: metrics,
        processingTime,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get performance metrics');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get webhook health metrics
   */
  async getWebhookHealth(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<WebhookHealthData>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting webhook health metrics');

      const performanceData = await this.analyticsRepository.getPerformanceMetrics(options);
      const webhookHealth = performanceData.webhookHealth || this.getDefaultWebhookHealth();

      // Enhance with additional calculations
      const enhancedHealth = await this.enhanceWebhookHealth(webhookHealth, context, options);

      return {
        success: true,
        data: enhancedHealth,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get webhook health');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sync status metrics
   */
  async getSyncStatus(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<SyncStatusData>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting sync status metrics');

      const performanceData = await this.analyticsRepository.getPerformanceMetrics(options);
      const syncStatus = performanceData.syncStatus || this.getDefaultSyncStatus();

      // Enhance with additional calculations
      const enhancedStatus = await this.enhanceSyncStatus(syncStatus, context, options);

      return {
        success: true,
        data: enhancedStatus,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get sync status');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get API performance metrics
   */
  async getApiMetrics(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<ApiMetricsData> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting API metrics');

      // This would integrate with actual API monitoring
      // For now, returning calculated metrics
      return {
        totalRequests: await this.calculateTotalRequests(context, options),
        averageResponseTime: await this.calculateAverageResponseTime(context, options),
        errorRate: await this.calculateErrorRate(context, options),
        successRate: await this.calculateSuccessRate(context, options),
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get API metrics');

      return this.getDefaultApiMetrics();
    }
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(context: AnalyticsContext): Promise<PlatformHealthData[]> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting platform health');

      const platforms = context.platform 
        ? [context.platform] 
        : [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];

      const healthChecks = await Promise.all(
        platforms.map(platform => this.checkPlatformHealth(platform))
      );

      return healthChecks;
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get platform health');

      return [];
    }
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsProcessingResult<any[]>> {
    try {
      this.logger.info({
        platform: context.platform,
      }, 'Getting system alerts');

      const alerts = await this.generateSystemAlerts(context, options);

      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      this.logger.error({
        platform: context.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get system alerts');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Private helper methods
   */
  private async enhanceWebhookHealth(
    health: WebhookHealthData,
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<WebhookHealthData> {
    // Add trend analysis and additional metrics
    return {
      ...health,
      trend: await this.calculateWebhookTrend(context, options),
      platformBreakdown: await this.getWebhookPlatformBreakdown(context, options),
    } as any;
  }

  private async enhanceSyncStatus(
    status: SyncStatusData,
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<SyncStatusData> {
    // Add trend analysis and additional metrics
    return {
      ...status,
      trend: await this.calculateSyncTrend(context, options),
      entityBreakdown: await this.getSyncEntityBreakdown(context, options),
    } as any;
  }

  private async checkPlatformHealth(platform: Platform): Promise<PlatformHealthData> {
    // This would perform actual health checks
    // For now, returning mock data based on recent activity
    const errorCount = Math.floor(Math.random() * 10);
    const responseTime = Math.random() * 1000 + 100;
    
    let status: 'healthy' | 'degraded' | 'down';
    if (errorCount > 5) {
      status = 'down';
    } else if (errorCount > 2 || responseTime > 800) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      platform,
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      errorRate: errorCount,
    };
  }

  private async generateSystemAlerts(
    context: AnalyticsContext,
    options: AnalyticsQueryOptions
  ): Promise<any[]> {
    const alerts = [];

    // Check webhook health
    const webhookHealth = await this.getWebhookHealth(context, options);
    if (webhookHealth.success && webhookHealth.data) {
      if (webhookHealth.data.failureRate > 10) {
        alerts.push({
          type: 'warning',
          message: `High webhook failure rate: ${webhookHealth.data.failureRate.toFixed(2)}%`,
          timestamp: new Date().toISOString(),
          platform: context.platform,
        });
      }
    }

    // Check sync status
    const syncStatus = await this.getSyncStatus(context, options);
    if (syncStatus.success && syncStatus.data) {
      if (syncStatus.data.failedSyncs > 5) {
        alerts.push({
          type: 'error',
          message: `Multiple sync failures detected: ${syncStatus.data.failedSyncs} failed syncs`,
          timestamp: new Date().toISOString(),
          platform: context.platform,
        });
      }
    }

    // Check platform health
    const platformHealth = await this.getPlatformHealth(context);
    platformHealth.forEach(health => {
      if (health.status === 'down') {
        alerts.push({
          type: 'error',
          message: `Platform ${health.platform} is down`,
          timestamp: new Date().toISOString(),
          platform: health.platform,
        });
      } else if (health.status === 'degraded') {
        alerts.push({
          type: 'warning',
          message: `Platform ${health.platform} performance is degraded`,
          timestamp: new Date().toISOString(),
          platform: health.platform,
        });
      }
    });

    return alerts;
  }

  // Default data methods
  private getDefaultWebhookHealth(): WebhookHealthData {
    return {
      totalWebhooks: 0,
      successRate: 0,
      averageProcessingTime: 0,
      failureRate: 0,
      retryRate: 0,
    };
  }

  private getDefaultSyncStatus(): SyncStatusData {
    return {
      lastSyncTime: new Date().toISOString(),
      successfulSyncs: 0,
      failedSyncs: 0,
      pendingSyncs: 0,
      averageSyncTime: 0,
    };
  }

  private getDefaultQueueStatus(): QueueStatusData {
    return {
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };
  }

  private getDefaultApiMetrics(): ApiMetricsData {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      successRate: 0,
    };
  }

  // Calculation methods (would be implemented with actual data)
  private async calculateTotalRequests(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<number> {
    return 0; // Placeholder
  }

  private async calculateAverageResponseTime(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<number> {
    return 0; // Placeholder
  }

  private async calculateErrorRate(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<number> {
    return 0; // Placeholder
  }

  private async calculateSuccessRate(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<number> {
    return 100; // Placeholder
  }

  private async calculateWebhookTrend(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<string> {
    return 'stable'; // Placeholder
  }

  private async getWebhookPlatformBreakdown(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<any> {
    return {}; // Placeholder
  }

  private async calculateSyncTrend(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<string> {
    return 'stable'; // Placeholder
  }

  private async getSyncEntityBreakdown(context: AnalyticsContext, options: AnalyticsQueryOptions): Promise<any> {
    return {}; // Placeholder
  }
}
