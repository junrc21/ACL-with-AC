import { Platform } from '@/shared/types/platform.types';
import { IWebhookStrategy, IWebhookStrategyFactory } from '../interfaces/IWebhookStrategy';
import { HotmartWebhookStrategy } from '../hotmart/HotmartWebhookStrategy';
import { NuvemshopWebhookStrategy } from '../nuvemshop/NuvemshopWebhookStrategy';
import { WooCommerceWebhookStrategy } from '../woocommerce/WooCommerceWebhookStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Factory for creating platform-specific webhook strategies
 */
export class WebhookStrategyFactory implements IWebhookStrategyFactory {
  private strategies: Map<Platform, IWebhookStrategy>;
  private logger = createPlatformLogger('FACTORY', 'WebhookStrategy');

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
      const hotmartStrategy = new HotmartWebhookStrategy();
      this.strategies.set(Platform.HOTMART, hotmartStrategy);

      // Initialize Nuvemshop strategy
      const nuvemshopStrategy = new NuvemshopWebhookStrategy();
      this.strategies.set(Platform.NUVEMSHOP, nuvemshopStrategy);

      // Initialize WooCommerce strategy
      const woocommerceStrategy = new WooCommerceWebhookStrategy();
      this.strategies.set(Platform.WOOCOMMERCE, woocommerceStrategy);

      this.logger.info({
        platforms: Array.from(this.strategies.keys()),
        count: this.strategies.size,
      }, 'Webhook strategies initialized successfully');

    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize webhook strategies');
      throw error;
    }
  }

  /**
   * Create webhook strategy for given platform
   */
  createStrategy(platform: Platform): IWebhookStrategy {
    const strategy = this.strategies.get(platform);

    if (!strategy) {
      const error = new Error(`No webhook strategy found for platform: ${platform}`);
      this.logger.error({
        platform,
        availablePlatforms: Array.from(this.strategies.keys()),
      }, 'Webhook strategy not found');
      throw error;
    }

    this.logger.debug({ platform }, 'Webhook strategy created');
    return strategy;
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): Map<Platform, IWebhookStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Check if platform is supported
   */
  isSupported(platform: Platform): boolean {
    const isSupported = this.strategies.has(platform);
    
    this.logger.debug({
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
        supportedEvents: strategy.getSupportedEvents(),
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
      'parseWebhook',
      'validateWebhook',
      'extractEventType',
      'extractEntityInfo',
      'verifySignature',
      'getSupportedEvents',
      'transformForEntityProcessing',
      'processWebhookEvent',
    ];

    for (const method of requiredMethods) {
      if (typeof (strategy as any)[method] !== 'function') {
        this.logger.error({
          platform,
          missingMethod: method,
        }, 'Strategy validation failed - missing required method');
        return false;
      }
    }

    // Check platform property
    if (strategy.platform !== platform) {
      this.logger.error({
        platform,
        strategyPlatform: strategy.platform,
      }, 'Strategy validation failed - platform mismatch');
      return false;
    }

    // Check supported events
    const supportedEvents = strategy.getSupportedEvents();
    if (!Array.isArray(supportedEvents) || supportedEvents.length === 0) {
      this.logger.error({
        platform,
        supportedEvents,
      }, 'Strategy validation failed - no supported events');
      return false;
    }

    this.logger.debug({ platform }, 'Strategy validation passed');
    return true;
  }

  /**
   * Get supported events for platform
   */
  getSupportedEvents(platform: Platform): string[] {
    const strategy = this.strategies.get(platform);
    if (!strategy) {
      return [];
    }
    
    return strategy.getSupportedEvents().map(event => event.toString());
  }

  /**
   * Get all supported events across all platforms
   */
  getAllSupportedEvents(): Record<string, string[]> {
    const allEvents: Record<string, string[]> = {};
    
    for (const [platform, strategy] of this.strategies) {
      allEvents[platform] = strategy.getSupportedEvents().map(event => event.toString());
    }
    
    return allEvents;
  }

  /**
   * Validate webhook data for platform
   */
  validateWebhookForPlatform(platform: Platform, data: any, signature?: string, secret?: string): {
    isValid: boolean;
    isAuthentic: boolean;
    errors: string[];
    warnings: string[];
  } {
    const strategy = this.strategies.get(platform);
    
    if (!strategy) {
      return {
        isValid: false,
        isAuthentic: false,
        errors: [`No webhook strategy found for platform: ${platform}`],
        warnings: [],
      };
    }
    
    return strategy.validateWebhook(data, signature, secret);
  }

  /**
   * Extract event type for platform
   */
  extractEventTypeForPlatform(platform: Platform, data: any): string | null {
    const strategy = this.strategies.get(platform);
    
    if (!strategy) {
      this.logger.error({ platform }, 'No strategy found for event type extraction');
      return null;
    }
    
    const eventType = strategy.extractEventType(data);
    return eventType ? eventType.toString() : null;
  }

  /**
   * Reload strategies (useful for hot reloading in development)
   */
  reloadStrategies(): void {
    this.logger.info('Reloading webhook strategies');
    this.strategies.clear();
    this.initializeStrategies();
  }

  /**
   * Get strategy statistics
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      totalStrategies: this.strategies.size,
      supportedPlatforms: Array.from(this.strategies.keys()),
      strategyInfo: this.getStrategyInfo(),
      allSupportedEvents: this.getAllSupportedEvents(),
    };

    // Add validation status for each strategy
    stats.validationStatus = {};
    for (const platform of this.strategies.keys()) {
      stats.validationStatus[platform] = this.validateStrategy(platform);
    }

    return stats;
  }

  /**
   * Get strategy health check
   */
  getHealthCheck(): {
    healthy: boolean;
    strategies: Record<string, { healthy: boolean; errors: string[] }>;
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
  } {
    const healthCheck = {
      healthy: true,
      strategies: {} as Record<string, { healthy: boolean; errors: string[] }>,
      summary: {
        total: this.strategies.size,
        healthy: 0,
        unhealthy: 0,
      },
    };

    for (const [platform, strategy] of this.strategies) {
      const errors: string[] = [];
      let strategyHealthy = true;

      try {
        // Check if strategy is properly initialized
        if (!strategy) {
          errors.push('Strategy not initialized');
          strategyHealthy = false;
        }

        // Check platform property
        if (strategy && strategy.platform !== platform) {
          errors.push('Platform mismatch');
          strategyHealthy = false;
        }

        // Check supported events
        if (strategy && strategy.getSupportedEvents().length === 0) {
          errors.push('No supported events');
          strategyHealthy = false;
        }

        // Validate strategy implementation
        if (strategy && !this.validateStrategy(platform)) {
          errors.push('Strategy validation failed');
          strategyHealthy = false;
        }

      } catch (error) {
        errors.push(`Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        strategyHealthy = false;
      }

      healthCheck.strategies[platform] = {
        healthy: strategyHealthy,
        errors,
      };

      if (strategyHealthy) {
        healthCheck.summary.healthy++;
      } else {
        healthCheck.summary.unhealthy++;
        healthCheck.healthy = false;
      }
    }

    return healthCheck;
  }

  /**
   * Test strategy with sample data
   */
  async testStrategy(platform: Platform, sampleData: any): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const strategy = this.strategies.get(platform);
    const results: Record<string, any> = {};
    const errors: string[] = [];

    if (!strategy) {
      errors.push(`No strategy found for platform: ${platform}`);
      return { success: false, results, errors };
    }

    try {
      // Test event type extraction
      results.eventType = strategy.extractEventType(sampleData);
      
      // Test entity info extraction
      results.entityInfo = strategy.extractEntityInfo(sampleData);
      
      // Test webhook validation
      results.validation = strategy.validateWebhook(sampleData);
      
      // Test supported events
      results.supportedEvents = strategy.getSupportedEvents();

      return { success: true, results, errors };

    } catch (error) {
      errors.push(`Strategy test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, results, errors };
    }
  }
}

// Export singleton instance
export const webhookStrategyFactory = new WebhookStrategyFactory();

export default WebhookStrategyFactory;
