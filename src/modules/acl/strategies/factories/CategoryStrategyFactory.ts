import { Platform } from '@/shared/types/platform.types';
import { ICategoryStrategy, ICategoryStrategyFactory } from '../interfaces/ICategoryStrategy';
import { HotmartCategoryStrategy } from '../hotmart/HotmartCategoryStrategy';
import { NuvemshopCategoryStrategy } from '../nuvemshop/NuvemshopCategoryStrategy';
import { WoocommerceCategoryStrategy } from '../woocommerce/WoocommerceCategoryStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Factory for creating platform-specific category strategies
 */
export class CategoryStrategyFactory implements ICategoryStrategyFactory {
  private strategies: Map<Platform, ICategoryStrategy>;
  private logger = createPlatformLogger('FACTORY', 'CategoryStrategy');

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
      const hotmartStrategy = new HotmartCategoryStrategy();
      this.strategies.set(Platform.HOTMART, hotmartStrategy);

      // Initialize Nuvemshop strategy
      const nuvemshopStrategy = new NuvemshopCategoryStrategy();
      this.strategies.set(Platform.NUVEMSHOP, nuvemshopStrategy);

      // Initialize WooCommerce strategy
      const woocommerceStrategy = new WoocommerceCategoryStrategy();
      this.strategies.set(Platform.WOOCOMMERCE, woocommerceStrategy);

      this.logger?.info({
        platforms: Array.from(this.strategies.keys()),
        count: this.strategies.size,
      }, 'Category strategies initialized successfully');

    } catch (error) {
      this.logger?.error({ error }, 'Failed to initialize category strategies');
      throw error;
    }
  }

  /**
   * Get appropriate strategy for platform
   */
  getStrategy(platform: Platform): ICategoryStrategy {
    const strategy = this.strategies.get(platform);

    if (!strategy) {
      const error = new Error(`No category strategy found for platform: ${platform}`);
      this.logger?.error({
        platform,
        availablePlatforms: Array.from(this.strategies.keys()),
      }, 'Category strategy not found');
      throw error;
    }

    this.logger?.debug({ platform }, 'Category strategy retrieved');
    return strategy;
  }

  /**
   * Register a new strategy
   */
  registerStrategy(platform: Platform, strategy: ICategoryStrategy): void {
    if (strategy.platform !== platform) {
      const error = new Error(`Strategy platform mismatch: expected ${platform}, got ${strategy.platform}`);
      this.logger?.error({
        expectedPlatform: platform,
        actualPlatform: strategy.platform,
      }, 'Strategy registration failed - platform mismatch');
      throw error;
    }

    this.strategies.set(platform, strategy);
    this.logger?.info({ platform }, 'Category strategy registered');
  }

  /**
   * Check if strategy exists for platform
   */
  hasStrategy(platform: Platform): boolean {
    const hasStrategy = this.strategies.has(platform);
    
    this.logger?.debug({
      platform,
      hasStrategy,
      availablePlatforms: Array.from(this.strategies.keys()),
    }, 'Strategy existence check');

    return hasStrategy;
  }

  /**
   * Create category strategy for given platform (alias for getStrategy)
   */
  createStrategy(platform: Platform): ICategoryStrategy {
    return this.getStrategy(platform);
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): Map<Platform, ICategoryStrategy> {
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
      'parseCategory',
      'validateCategoryData',
      'extractStoreInfo',
      'applyBusinessRules',
      'buildHierarchy',
      'getCategoryPath',
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
   * Validate all strategies
   */
  validateAllStrategies(): Record<Platform, boolean> {
    const results: Record<Platform, boolean> = {} as Record<Platform, boolean>;
    
    for (const platform of this.strategies.keys()) {
      results[platform] = this.validateStrategy(platform);
    }

    return results;
  }

  /**
   * Reload strategies (useful for hot reloading in development)
   */
  reloadStrategies(): void {
    this.logger?.info('Reloading category strategies');
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
      validationResults: this.validateAllStrategies(),
    };
  }

  /**
   * Remove strategy for platform
   */
  removeStrategy(platform: Platform): boolean {
    const removed = this.strategies.delete(platform);
    
    if (removed) {
      this.logger?.info({ platform }, 'Category strategy removed');
    } else {
      this.logger?.warn({ platform }, 'Attempted to remove non-existent strategy');
    }

    return removed;
  }

  /**
   * Clear all strategies
   */
  clearStrategies(): void {
    const count = this.strategies.size;
    this.strategies.clear();
    this.logger?.info({ clearedCount: count }, 'All category strategies cleared');
  }

  /**
   * Get strategy count
   */
  getStrategyCount(): number {
    return this.strategies.size;
  }

  /**
   * Check if factory has any strategies
   */
  hasAnyStrategies(): boolean {
    return this.strategies.size > 0;
  }
}

// Export singleton instance
export const categoryStrategyFactory = new CategoryStrategyFactory();

export default CategoryStrategyFactory;
