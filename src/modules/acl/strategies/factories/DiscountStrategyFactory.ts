import { Platform } from '@/shared/types/platform.types';
import { IDiscountStrategy } from '../interfaces/IDiscountStrategy';
import { HotmartDiscountStrategy } from '../hotmart/HotmartDiscountStrategy';
import { NuvemshopDiscountStrategy } from '../nuvemshop/NuvemshopDiscountStrategy';
import { WooCommerceDiscountStrategy } from '../woocommerce/WooCommerceDiscountStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Factory for creating platform-specific discount strategies
 */
export class DiscountStrategyFactory {
  private static strategies: Map<Platform, IDiscountStrategy> = new Map();
  private static logger = createPlatformLogger('FACTORY', 'DiscountStrategy');

  /**
   * Get discount strategy for a specific platform
   */
  static getStrategy(platform: Platform): IDiscountStrategy {
    this.logger.debug({ platform }, 'Getting discount strategy');

    // Return cached strategy if available
    if (this.strategies.has(platform)) {
      return this.strategies.get(platform)!;
    }

    // Create new strategy instance
    let strategy: IDiscountStrategy;

    switch (platform) {
      case Platform.HOTMART:
        strategy = new HotmartDiscountStrategy();
        break;

      case Platform.NUVEMSHOP:
        strategy = new NuvemshopDiscountStrategy();
        break;

      case Platform.WOOCOMMERCE:
        strategy = new WooCommerceDiscountStrategy();
        break;

      default:
        this.logger.error({ platform }, 'Unsupported platform for discount strategy');
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Cache the strategy
    this.strategies.set(platform, strategy);
    this.logger.info({ platform }, 'Created and cached discount strategy');

    return strategy;
  }

  /**
   * Get all available discount strategies
   */
  static getAllStrategies(): Map<Platform, IDiscountStrategy> {
    // Ensure all strategies are initialized
    Object.values(Platform).forEach(platform => {
      this.getStrategy(platform);
    });

    return new Map(this.strategies);
  }

  /**
   * Check if a platform supports discounts
   */
  static isSupported(platform: Platform): boolean {
    try {
      this.getStrategy(platform);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported platforms for discounts
   */
  static getSupportedPlatforms(): Platform[] {
    return Object.values(Platform).filter(platform => this.isSupported(platform));
  }

  /**
   * Clear strategy cache (useful for testing)
   */
  static clearCache(): void {
    this.strategies.clear();
    this.logger.debug('Cleared discount strategy cache');
  }

  /**
   * Get strategy statistics
   */
  static getStatistics(): {
    totalStrategies: number;
    supportedPlatforms: Platform[];
    cachedStrategies: Platform[];
  } {
    return {
      totalStrategies: this.strategies.size,
      supportedPlatforms: this.getSupportedPlatforms(),
      cachedStrategies: Array.from(this.strategies.keys()),
    };
  }
}
