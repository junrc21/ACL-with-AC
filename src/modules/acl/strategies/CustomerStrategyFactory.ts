/**
 * Customer strategy factory
 * Creates appropriate customer strategy based on platform
 */

import { Platform } from '@/shared/types/platform.types';
import { CustomerStrategy } from './base/CustomerStrategy';
import { HotmartCustomerStrategy } from './hotmart/HotmartCustomerStrategy';
import { NuvemshopCustomerStrategy } from './nuvemshop/NuvemshopCustomerStrategy';
import { WoocommerceCustomerStrategy } from './woocommerce/WoocommerceCustomerStrategy';

/**
 * Factory class for creating customer strategies
 */
export class CustomerStrategyFactory {
  private static strategies: Map<Platform, CustomerStrategy> = new Map();

  /**
   * Get customer strategy for the specified platform
   * @param platform - Platform to get strategy for
   * @returns Customer strategy instance
   */
  static getStrategy(platform: Platform): CustomerStrategy {
    // Use singleton pattern for strategy instances
    if (!this.strategies.has(platform)) {
      const strategy = this.createStrategy(platform);
      this.strategies.set(platform, strategy);
    }

    return this.strategies.get(platform)!;
  }

  /**
   * Create new customer strategy instance for platform
   * @param platform - Platform to create strategy for
   * @returns Customer strategy instance
   */
  private static createStrategy(platform: Platform): CustomerStrategy {
    switch (platform) {
      case Platform.HOTMART:
        return new HotmartCustomerStrategy();
      
      case Platform.NUVEMSHOP:
        return new NuvemshopCustomerStrategy();
      
      case Platform.WOOCOMMERCE:
        return new WoocommerceCustomerStrategy();
      
      default:
        throw new Error(`Unsupported platform for customer strategy: ${platform}`);
    }
  }

  /**
   * Get all available platforms for customer strategies
   * @returns Array of supported platforms
   */
  static getSupportedPlatforms(): Platform[] {
    return [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
  }

  /**
   * Check if platform is supported for customer strategies
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
