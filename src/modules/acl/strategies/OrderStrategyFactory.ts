/**
 * Order strategy factory
 * Creates appropriate order strategy based on platform
 */

import { Platform } from '@/shared/types/platform.types';
import { OrderStrategy } from './base/OrderStrategy';
import { HotmartOrderStrategy } from './hotmart/HotmartOrderStrategy';
import { NuvemshopOrderStrategy } from './nuvemshop/NuvemshopOrderStrategy';
import { WoocommerceOrderStrategy } from './woocommerce/WoocommerceOrderStrategy';

/**
 * Factory class for creating order strategies
 */
export class OrderStrategyFactory {
  private static strategies: Map<Platform, OrderStrategy> = new Map();

  /**
   * Get order strategy for the specified platform
   * @param platform - Platform to get strategy for
   * @returns Order strategy instance
   */
  static getStrategy(platform: Platform): OrderStrategy {
    // Use singleton pattern for strategy instances
    if (!this.strategies.has(platform)) {
      const strategy = this.createStrategy(platform);
      this.strategies.set(platform, strategy);
    }

    return this.strategies.get(platform)!;
  }

  /**
   * Create new order strategy instance for platform
   * @param platform - Platform to create strategy for
   * @returns Order strategy instance
   */
  private static createStrategy(platform: Platform): OrderStrategy {
    switch (platform) {
      case Platform.HOTMART:
        return new HotmartOrderStrategy();
      
      case Platform.NUVEMSHOP:
        return new NuvemshopOrderStrategy();
      
      case Platform.WOOCOMMERCE:
        return new WoocommerceOrderStrategy();
      
      default:
        throw new Error(`Unsupported platform for order strategy: ${platform}`);
    }
  }

  /**
   * Get all available platforms for order strategies
   * @returns Array of supported platforms
   */
  static getSupportedPlatforms(): Platform[] {
    return [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
  }

  /**
   * Check if platform is supported for order strategies
   * @param platform - Platform to check
   * @returns True if platform is supported
   */
  static isSupported(platform: Platform): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }

  /**
   * Clear strategy cache (useful for testing)
   */
  static clearCache(): void {
    this.strategies.clear();
  }
}

/**
 * Export singleton instance for convenience
 */
export const orderStrategyFactory = new class {
  /**
   * Create strategy for platform
   * @param platform - Platform to create strategy for
   * @returns Order strategy instance
   */
  createStrategy(platform: Platform): OrderStrategy {
    return OrderStrategyFactory.getStrategy(platform);
  }

  /**
   * Get supported platforms
   * @returns Array of supported platforms
   */
  getSupportedPlatforms(): Platform[] {
    return OrderStrategyFactory.getSupportedPlatforms();
  }

  /**
   * Check if platform is supported
   * @param platform - Platform to check
   * @returns True if platform is supported
   */
  isSupported(platform: Platform): boolean {
    return OrderStrategyFactory.isSupported(platform);
  }
}();
