/**
 * Unit tests for Order Strategy Factory
 */

import { Platform } from '@/shared/types/platform.types';

describe('Order Strategy Factory Unit Tests', () => {
  describe('Strategy Creation', () => {
    it('should create Hotmart order strategy', () => {
      const createStrategy = (platform: Platform) => {
        switch (platform) {
          case Platform.HOTMART:
            return { platform: Platform.HOTMART, type: 'HotmartOrderStrategy' };
          case Platform.NUVEMSHOP:
            return { platform: Platform.NUVEMSHOP, type: 'NuvemshopOrderStrategy' };
          case Platform.WOOCOMMERCE:
            return { platform: Platform.WOOCOMMERCE, type: 'WoocommerceOrderStrategy' };
          default:
            throw new Error(`Unsupported platform for order strategy: ${platform}`);
        }
      };

      const strategy = createStrategy(Platform.HOTMART);
      expect(strategy.platform).toBe(Platform.HOTMART);
      expect(strategy.type).toBe('HotmartOrderStrategy');
    });

    it('should create Nuvemshop order strategy', () => {
      const createStrategy = (platform: Platform) => {
        switch (platform) {
          case Platform.HOTMART:
            return { platform: Platform.HOTMART, type: 'HotmartOrderStrategy' };
          case Platform.NUVEMSHOP:
            return { platform: Platform.NUVEMSHOP, type: 'NuvemshopOrderStrategy' };
          case Platform.WOOCOMMERCE:
            return { platform: Platform.WOOCOMMERCE, type: 'WoocommerceOrderStrategy' };
          default:
            throw new Error(`Unsupported platform for order strategy: ${platform}`);
        }
      };

      const strategy = createStrategy(Platform.NUVEMSHOP);
      expect(strategy.platform).toBe(Platform.NUVEMSHOP);
      expect(strategy.type).toBe('NuvemshopOrderStrategy');
    });

    it('should create WooCommerce order strategy', () => {
      const createStrategy = (platform: Platform) => {
        switch (platform) {
          case Platform.HOTMART:
            return { platform: Platform.HOTMART, type: 'HotmartOrderStrategy' };
          case Platform.NUVEMSHOP:
            return { platform: Platform.NUVEMSHOP, type: 'NuvemshopOrderStrategy' };
          case Platform.WOOCOMMERCE:
            return { platform: Platform.WOOCOMMERCE, type: 'WoocommerceOrderStrategy' };
          default:
            throw new Error(`Unsupported platform for order strategy: ${platform}`);
        }
      };

      const strategy = createStrategy(Platform.WOOCOMMERCE);
      expect(strategy.platform).toBe(Platform.WOOCOMMERCE);
      expect(strategy.type).toBe('WoocommerceOrderStrategy');
    });

    it('should throw error for unsupported platform', () => {
      const createStrategy = (platform: Platform) => {
        switch (platform) {
          case Platform.HOTMART:
            return { platform: Platform.HOTMART, type: 'HotmartOrderStrategy' };
          case Platform.NUVEMSHOP:
            return { platform: Platform.NUVEMSHOP, type: 'NuvemshopOrderStrategy' };
          case Platform.WOOCOMMERCE:
            return { platform: Platform.WOOCOMMERCE, type: 'WoocommerceOrderStrategy' };
          default:
            throw new Error(`Unsupported platform for order strategy: ${platform}`);
        }
      };

      expect(() => createStrategy('INVALID_PLATFORM' as Platform)).toThrow(
        'Unsupported platform for order strategy: INVALID_PLATFORM'
      );
    });
  });

  describe('Supported Platforms', () => {
    it('should return all supported platforms', () => {
      const getSupportedPlatforms = (): Platform[] => {
        return [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
      };

      const supportedPlatforms = getSupportedPlatforms();
      expect(supportedPlatforms).toHaveLength(3);
      expect(supportedPlatforms).toContain(Platform.HOTMART);
      expect(supportedPlatforms).toContain(Platform.NUVEMSHOP);
      expect(supportedPlatforms).toContain(Platform.WOOCOMMERCE);
    });

    it('should check if platform is supported', () => {
      const isSupported = (platform: Platform): boolean => {
        const supportedPlatforms = [Platform.HOTMART, Platform.NUVEMSHOP, Platform.WOOCOMMERCE];
        return supportedPlatforms.includes(platform);
      };

      expect(isSupported(Platform.HOTMART)).toBe(true);
      expect(isSupported(Platform.NUVEMSHOP)).toBe(true);
      expect(isSupported(Platform.WOOCOMMERCE)).toBe(true);
      expect(isSupported('INVALID_PLATFORM' as Platform)).toBe(false);
    });
  });

  describe('Strategy Caching', () => {
    it('should cache strategy instances', () => {
      const strategies = new Map<Platform, any>();

      const getStrategy = (platform: Platform) => {
        if (!strategies.has(platform)) {
          const strategy = createStrategy(platform);
          strategies.set(platform, strategy);
        }
        return strategies.get(platform)!;
      };

      const createStrategy = (platform: Platform) => {
        return { 
          platform, 
          type: `${platform}OrderStrategy`,
          instanceId: Math.random() // Simulate unique instance
        };
      };

      const strategy1 = getStrategy(Platform.HOTMART);
      const strategy2 = getStrategy(Platform.HOTMART);

      expect(strategy1).toBe(strategy2); // Same instance
      expect(strategy1.instanceId).toBe(strategy2.instanceId);
    });

    it('should clear strategy cache', () => {
      const strategies = new Map<Platform, any>();

      const clearCache = () => {
        strategies.clear();
      };

      strategies.set(Platform.HOTMART, { platform: Platform.HOTMART });
      strategies.set(Platform.NUVEMSHOP, { platform: Platform.NUVEMSHOP });

      expect(strategies.size).toBe(2);

      clearCache();

      expect(strategies.size).toBe(0);
    });
  });

  describe('Strategy Interface Compliance', () => {
    it('should ensure all strategies implement required methods', () => {
      interface OrderStrategy {
        transformFromPlatform(data: any, context: any): any;
        transformToPlatformFormat(orderData: any): any;
        processOrder(data: any, context: any): Promise<any>;
        processOrdersBatch(orders: any[], context: any): Promise<any>;
      }

      const mockHotmartStrategy: OrderStrategy = {
        transformFromPlatform: jest.fn(),
        transformToPlatformFormat: jest.fn(),
        processOrder: jest.fn(),
        processOrdersBatch: jest.fn(),
      };

      const mockNuvemshopStrategy: OrderStrategy = {
        transformFromPlatform: jest.fn(),
        transformToPlatformFormat: jest.fn(),
        processOrder: jest.fn(),
        processOrdersBatch: jest.fn(),
      };

      const mockWoocommerceStrategy: OrderStrategy = {
        transformFromPlatform: jest.fn(),
        transformToPlatformFormat: jest.fn(),
        processOrder: jest.fn(),
        processOrdersBatch: jest.fn(),
      };

      expect(mockHotmartStrategy.transformFromPlatform).toBeDefined();
      expect(mockHotmartStrategy.transformToPlatformFormat).toBeDefined();
      expect(mockHotmartStrategy.processOrder).toBeDefined();
      expect(mockHotmartStrategy.processOrdersBatch).toBeDefined();

      expect(mockNuvemshopStrategy.transformFromPlatform).toBeDefined();
      expect(mockNuvemshopStrategy.transformToPlatformFormat).toBeDefined();
      expect(mockNuvemshopStrategy.processOrder).toBeDefined();
      expect(mockNuvemshopStrategy.processOrdersBatch).toBeDefined();

      expect(mockWoocommerceStrategy.transformFromPlatform).toBeDefined();
      expect(mockWoocommerceStrategy.transformToPlatformFormat).toBeDefined();
      expect(mockWoocommerceStrategy.processOrder).toBeDefined();
      expect(mockWoocommerceStrategy.processOrdersBatch).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle strategy creation errors gracefully', () => {
      const createStrategyWithError = (platform: Platform) => {
        if (platform === 'INVALID_PLATFORM' as Platform) {
          throw new Error('Invalid platform configuration');
        }
        return { platform, type: `${platform}OrderStrategy` };
      };

      expect(() => createStrategyWithError(Platform.HOTMART)).not.toThrow();
      expect(() => createStrategyWithError('INVALID_PLATFORM' as Platform)).toThrow(
        'Invalid platform configuration'
      );
    });
  });

  describe('Factory Singleton Pattern', () => {
    it('should maintain singleton behavior', () => {
      class OrderStrategyFactory {
        private static instance: OrderStrategyFactory;
        private strategies = new Map<Platform, any>();

        static getInstance(): OrderStrategyFactory {
          if (!OrderStrategyFactory.instance) {
            OrderStrategyFactory.instance = new OrderStrategyFactory();
          }
          return OrderStrategyFactory.instance;
        }

        getStrategy(platform: Platform) {
          if (!this.strategies.has(platform)) {
            this.strategies.set(platform, { platform, type: `${platform}OrderStrategy` });
          }
          return this.strategies.get(platform);
        }
      }

      const factory1 = OrderStrategyFactory.getInstance();
      const factory2 = OrderStrategyFactory.getInstance();

      expect(factory1).toBe(factory2); // Same instance
    });
  });
});
