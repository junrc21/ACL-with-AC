import { Platform } from '@/shared/types/platform.types';
import { IProductStrategy, IProductStrategyFactory } from '../interfaces/IProductStrategy';
import { HotmartProductStrategy } from '../hotmart/HotmartProductStrategy';
import { NuvemshopProductStrategy } from '../nuvemshop/NuvemshopProductStrategy';
import { WoocommerceProductStrategy } from '../woocommerce/WoocommerceProductStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Factory for creating platform-specific product strategies
 */
export class ProductStrategyFactory implements IProductStrategyFactory {
  private strategies: Map<Platform, IProductStrategy>;
  private logger = createPlatformLogger('FACTORY', 'ProductStrategy');

  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize all available strategies
   */
  private initializeStrategies(): void {
    try {
      // Initialize Hotmart strategy
      const hotmartStrategy = new HotmartProductStrategy();
      this.strategies.set(Platform.HOTMART, hotmartStrategy);

      // Initialize Nuvemshop strategy
      const nuvemshopStrategy = new NuvemshopProductStrategy();
      this.strategies.set(Platform.NUVEMSHOP, nuvemshopStrategy);

      // Initialize WooCommerce strategy
      const woocommerceStrategy = new WoocommerceProductStrategy();
      this.strategies.set(Platform.WOOCOMMERCE, woocommerceStrategy);

      this.logger?.info({
        platforms: Array.from(this.strategies.keys()),
        count: this.strategies.size,
      }, 'Product strategies initialized successfully');

    } catch (error) {
      this.logger?.error({ error }, 'Failed to initialize product strategies');
      throw error;
    }
  }

  /**
   * Create product strategy for given platform
   */
  createStrategy(platform: Platform): IProductStrategy {
    const strategy = this.strategies.get(platform);

    if (!strategy) {
      const error = new Error(`No product strategy found for platform: ${platform}`);
      this.logger?.error({
        platform,
        availablePlatforms: Array.from(this.strategies.keys()),
      }, 'Product strategy not found');
      throw error;
    }

    this.logger?.debug({ platform }, 'Product strategy created');
    return strategy;
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): Map<Platform, IProductStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Check if platform is supported
   */
  isSupported(platform: Platform): boolean {
    const isSupported = this.strategies.has(platform);
    
    this.logger?.debug({
      platform,
      isSupported,
      availablePlatforms: Array.from(this.strategies.keys()),
    }, 'Platform support check');

    return isSupported;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): Platform[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy information for debugging
   */
  getStrategyInfo(): Record<string, any> {
    const info: Record<string, any> = {};

    for (const [platform, strategy] of this.strategies) {
      info[platform] = {
        platform: strategy.platform,
        className: strategy.constructor.name,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(strategy))
          .filter(name => name !== 'constructor' && typeof (strategy as any)[name] === 'function'),
      };
    }

    return info;
  }

  /**
   * Validate strategy implementation
   */
  validateStrategy(platform: Platform): boolean {
    const strategy = this.strategies.get(platform);
    
    if (!strategy) {
      return false;
    }

    // Check required methods
    const requiredMethods = [
      'parseProduct',
      'validateProductData',
      'extractStoreInfo',
      'applyBusinessRules',
    ];

    for (const method of requiredMethods) {
      if (typeof (strategy as any)[method] !== 'function') {
        this.logger?.error({
          platform,
          missingMethod: method,
        }, 'Strategy validation failed - missing required method');
        return false;
      }
    }

    // Check platform property
    if (strategy.platform !== platform) {
      this.logger?.error({
        platform,
        strategyPlatform: strategy.platform,
      }, 'Strategy validation failed - platform mismatch');
      return false;
    }

    this.logger?.debug({ platform }, 'Strategy validation passed');
    return true;
  }

  /**
   * Reload strategies (useful for hot reloading in development)
   */
  reloadStrategies(): void {
    this.logger?.info('Reloading product strategies');
    this.strategies.clear();
    this.initializeStrategies();
  }

  /**
   * Get strategy statistics
   */
  getStatistics(): Record<string, any> {
    return {
      totalStrategies: this.strategies.size,
      supportedPlatforms: Array.from(this.strategies.keys()),
      strategyInfo: this.getStrategyInfo(),
    };
  }
}

// Export singleton instance
export const productStrategyFactory = new ProductStrategyFactory();

export default ProductStrategyFactory;
