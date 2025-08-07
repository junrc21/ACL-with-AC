/**
 * Analytics Strategy Factory
 * Creates platform-specific analytics strategy instances
 */

import { Platform } from '@prisma/client';
import { IAnalyticsStrategy } from '../interfaces/IAnalyticsStrategy';
import { HotmartAnalyticsStrategy } from '../hotmart/HotmartAnalyticsStrategy';
import { NuvemshopAnalyticsStrategy } from '../nuvemshop/NuvemshopAnalyticsStrategy';
import { WooCommerceAnalyticsStrategy } from '../woocommerce/WooCommerceAnalyticsStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Factory class for creating analytics strategies
 */
export class AnalyticsStrategyFactory {
  private static logger = createPlatformLogger('FACTORY', 'AnalyticsStrategyFactory');
  private static strategies: Map<Platform, IAnalyticsStrategy> = new Map();

  /**
   * Get analytics strategy for a platform
   */
  static getStrategy(platform: Platform): IAnalyticsStrategy {
    this.logger.info({ platform }, 'Getting analytics strategy');

    // Return cached strategy if available
    if (this.strategies.has(platform)) {
      return this.strategies.get(platform)!;
    }

    // Create new strategy instance
    let strategy: IAnalyticsStrategy;

    switch (platform) {
      case Platform.HOTMART:
        strategy = new HotmartAnalyticsStrategy();
        break;
      case Platform.NUVEMSHOP:
        strategy = new NuvemshopAnalyticsStrategy();
        break;
      case Platform.WOOCOMMERCE:
        strategy = new WooCommerceAnalyticsStrategy();
        break;
      default:
        this.logger.error({ platform }, 'Unsupported platform for analytics');
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Cache the strategy
    this.strategies.set(platform, strategy);

    this.logger.info({ platform }, 'Analytics strategy created and cached');
    return strategy;
  }

  /**
   * Get all available platforms
   */
  static getSupportedPlatforms(): Platform[] {
    return [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
  }

  /**
   * Check if a platform is supported
   */
  static isPlatformSupported(platform: Platform): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }

  /**
   * Get features supported by a platform
   */
  static getPlatformFeatures(platform: Platform): string[] {
    try {
      const strategy = this.getStrategy(platform);
      return strategy.getSupportedFeatures();
    } catch (error) {
      this.logger.error({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get platform features');
      return [];
    }
  }

  /**
   * Validate analytics context for a platform
   */
  static validateContext(platform: Platform, context: any): boolean {
    try {
      const strategy = this.getStrategy(platform);
      return strategy.validateContext(context);
    } catch (error) {
      this.logger.error({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to validate context');
      return false;
    }
  }

  /**
   * Clear strategy cache (useful for testing)
   */
  static clearCache(): void {
    this.strategies.clear();
    this.logger.info('Analytics strategy cache cleared');
  }

  /**
   * Get strategy health check
   */
  static async getStrategyHealth(platform: Platform): Promise<{
    platform: Platform;
    status: 'healthy' | 'degraded' | 'down';
    features: string[];
    lastCheck: string;
  }> {
    try {
      const strategy = this.getStrategy(platform);
      const features = strategy.getSupportedFeatures();
      
      return {
        platform,
        status: 'healthy',
        features,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Strategy health check failed');
      
      return {
        platform,
        status: 'down',
        features: [],
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Get all strategies health status
   */
  static async getAllStrategiesHealth(): Promise<Array<{
    platform: Platform;
    status: 'healthy' | 'degraded' | 'down';
    features: string[];
    lastCheck: string;
  }>> {
    const platforms = this.getSupportedPlatforms();
    const healthChecks = await Promise.all(
      platforms.map(platform => this.getStrategyHealth(platform))
    );
    
    return healthChecks;
  }
}

/**
 * Convenience function to get analytics strategy
 */
export const getAnalyticsStrategy = (platform: Platform): IAnalyticsStrategy => {
  return AnalyticsStrategyFactory.getStrategy(platform);
};

/**
 * Convenience function to check platform support
 */
export const isAnalyticsPlatformSupported = (platform: Platform): boolean => {
  return AnalyticsStrategyFactory.isPlatformSupported(platform);
};

/**
 * Export the factory as default
 */
export default AnalyticsStrategyFactory;
