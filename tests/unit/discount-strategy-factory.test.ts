import { DiscountStrategyFactory } from '@/modules/acl/strategies/factories/DiscountStrategyFactory';
import { HotmartDiscountStrategy } from '@/modules/acl/strategies/hotmart/HotmartDiscountStrategy';
import { NuvemshopDiscountStrategy } from '@/modules/acl/strategies/nuvemshop/NuvemshopDiscountStrategy';
import { WooCommerceDiscountStrategy } from '@/modules/acl/strategies/woocommerce/WooCommerceDiscountStrategy';
import { Platform } from '@/shared/types/platform.types';

describe('DiscountStrategyFactory', () => {
  beforeEach(() => {
    // Clear cache before each test
    DiscountStrategyFactory.clearCache();
  });

  describe('getStrategy', () => {
    it('should return HotmartDiscountStrategy for HOTMART platform', () => {
      const strategy = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      
      expect(strategy).toBeInstanceOf(HotmartDiscountStrategy);
      expect(strategy.platform).toBe(Platform.HOTMART);
    });

    it('should return NuvemshopDiscountStrategy for NUVEMSHOP platform', () => {
      const strategy = DiscountStrategyFactory.getStrategy(Platform.NUVEMSHOP);
      
      expect(strategy).toBeInstanceOf(NuvemshopDiscountStrategy);
      expect(strategy.platform).toBe(Platform.NUVEMSHOP);
    });

    it('should return WooCommerceDiscountStrategy for WOOCOMMERCE platform', () => {
      const strategy = DiscountStrategyFactory.getStrategy(Platform.WOOCOMMERCE);
      
      expect(strategy).toBeInstanceOf(WooCommerceDiscountStrategy);
      expect(strategy.platform).toBe(Platform.WOOCOMMERCE);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        DiscountStrategyFactory.getStrategy('UNSUPPORTED' as Platform);
      }).toThrow('Unsupported platform: UNSUPPORTED');
    });

    it('should cache strategy instances', () => {
      const strategy1 = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      const strategy2 = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      
      expect(strategy1).toBe(strategy2); // Same instance
    });

    it('should return different instances for different platforms', () => {
      const hotmartStrategy = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      const nuvemshopStrategy = DiscountStrategyFactory.getStrategy(Platform.NUVEMSHOP);
      const woocommerceStrategy = DiscountStrategyFactory.getStrategy(Platform.WOOCOMMERCE);
      
      expect(hotmartStrategy).not.toBe(nuvemshopStrategy);
      expect(nuvemshopStrategy).not.toBe(woocommerceStrategy);
      expect(hotmartStrategy).not.toBe(woocommerceStrategy);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all available strategies', () => {
      const strategies = DiscountStrategyFactory.getAllStrategies();
      
      expect(strategies.size).toBe(3);
      expect(strategies.has(Platform.HOTMART)).toBe(true);
      expect(strategies.has(Platform.NUVEMSHOP)).toBe(true);
      expect(strategies.has(Platform.WOOCOMMERCE)).toBe(true);
      
      expect(strategies.get(Platform.HOTMART)).toBeInstanceOf(HotmartDiscountStrategy);
      expect(strategies.get(Platform.NUVEMSHOP)).toBeInstanceOf(NuvemshopDiscountStrategy);
      expect(strategies.get(Platform.WOOCOMMERCE)).toBeInstanceOf(WooCommerceDiscountStrategy);
    });

    it('should initialize all strategies when called', () => {
      // Initially no strategies cached
      expect(DiscountStrategyFactory.getStatistics().cachedStrategies).toHaveLength(0);
      
      DiscountStrategyFactory.getAllStrategies();
      
      // All strategies should now be cached
      expect(DiscountStrategyFactory.getStatistics().cachedStrategies).toHaveLength(3);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported platforms', () => {
      expect(DiscountStrategyFactory.isSupported(Platform.HOTMART)).toBe(true);
      expect(DiscountStrategyFactory.isSupported(Platform.NUVEMSHOP)).toBe(true);
      expect(DiscountStrategyFactory.isSupported(Platform.WOOCOMMERCE)).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(DiscountStrategyFactory.isSupported('UNSUPPORTED' as Platform)).toBe(false);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return all supported platforms', () => {
      const supportedPlatforms = DiscountStrategyFactory.getSupportedPlatforms();
      
      expect(supportedPlatforms).toContain(Platform.HOTMART);
      expect(supportedPlatforms).toContain(Platform.NUVEMSHOP);
      expect(supportedPlatforms).toContain(Platform.WOOCOMMERCE);
      expect(supportedPlatforms).toHaveLength(3);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached strategies', () => {
      // Create some strategies to cache them
      DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      DiscountStrategyFactory.getStrategy(Platform.NUVEMSHOP);
      
      expect(DiscountStrategyFactory.getStatistics().cachedStrategies).toHaveLength(2);
      
      DiscountStrategyFactory.clearCache();
      
      expect(DiscountStrategyFactory.getStatistics().cachedStrategies).toHaveLength(0);
    });

    it('should allow creating new strategies after clearing cache', () => {
      const strategy1 = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      DiscountStrategyFactory.clearCache();
      const strategy2 = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      
      expect(strategy1).not.toBe(strategy2); // Different instances after cache clear
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics when no strategies cached', () => {
      const stats = DiscountStrategyFactory.getStatistics();
      
      expect(stats.totalStrategies).toBe(0);
      expect(stats.cachedStrategies).toHaveLength(0);
      expect(stats.supportedPlatforms).toHaveLength(3);
      expect(stats.supportedPlatforms).toContain(Platform.HOTMART);
      expect(stats.supportedPlatforms).toContain(Platform.NUVEMSHOP);
      expect(stats.supportedPlatforms).toContain(Platform.WOOCOMMERCE);
    });

    it('should return correct statistics when some strategies cached', () => {
      DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      DiscountStrategyFactory.getStrategy(Platform.NUVEMSHOP);
      
      const stats = DiscountStrategyFactory.getStatistics();
      
      expect(stats.totalStrategies).toBe(2);
      expect(stats.cachedStrategies).toHaveLength(2);
      expect(stats.cachedStrategies).toContain(Platform.HOTMART);
      expect(stats.cachedStrategies).toContain(Platform.NUVEMSHOP);
      expect(stats.supportedPlatforms).toHaveLength(3);
    });

    it('should return correct statistics when all strategies cached', () => {
      DiscountStrategyFactory.getAllStrategies();
      
      const stats = DiscountStrategyFactory.getStatistics();
      
      expect(stats.totalStrategies).toBe(3);
      expect(stats.cachedStrategies).toHaveLength(3);
      expect(stats.cachedStrategies.sort()).toEqual([
        Platform.HOTMART,
        Platform.NUVEMSHOP,
        Platform.WOOCOMMERCE,
      ].sort());
      expect(stats.supportedPlatforms).toHaveLength(3);
    });
  });

  describe('Strategy interface compliance', () => {
    it('should ensure all strategies implement required methods', () => {
      const strategies = DiscountStrategyFactory.getAllStrategies();
      
      strategies.forEach((strategy, platform) => {
        // Check that all required methods exist
        expect(typeof strategy.parseCoupon).toBe('function');
        expect(typeof strategy.validateCouponData).toBe('function');
        expect(typeof strategy.extractStoreInfo).toBe('function');
        expect(typeof strategy.applyBusinessRules).toBe('function');
        expect(typeof strategy.validateCouponUsage).toBe('function');
        expect(typeof strategy.applyDiscount).toBe('function');
        
        // Check platform property
        expect(strategy.platform).toBe(platform);
      });
    });

    it('should ensure strategies can handle basic operations', async () => {
      const strategies = DiscountStrategyFactory.getAllStrategies();

      // Mock loggers for all strategies
      Object.values(strategies).forEach(strategy => {
        (strategy as any).logger = {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };
      });

      for (const [platform, strategy] of strategies) {
        // Test extractStoreInfo
        const storeInfo = strategy.extractStoreInfo({});
        expect(storeInfo).toHaveProperty('storeId');
        
        // Test validateCouponData with invalid data
        const validation = strategy.validateCouponData({});
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('errors');
        expect(Array.isArray(validation.errors)).toBe(true);
        
        // Test applyBusinessRules
        const mockCouponData = {
          platform,
          code: 'TEST',
          type: 'percentage' as any,
          amount: 10,
          scope: 'cart' as any,
          status: 'active' as any,
        };
        
        const processedCoupon = strategy.applyBusinessRules(mockCouponData as any);
        expect(processedCoupon).toHaveProperty('platform', platform);
        expect(processedCoupon).toHaveProperty('code', 'TEST');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle strategy creation errors gracefully', () => {
      expect(() => {
        DiscountStrategyFactory.getStrategy('INVALID' as Platform);
      }).toThrow('Unsupported platform: INVALID');
    });

    it('should maintain cache integrity after errors', () => {
      // Get a valid strategy first
      const validStrategy = DiscountStrategyFactory.getStrategy(Platform.HOTMART);

      // Try to get an invalid strategy
      try {
        DiscountStrategyFactory.getStrategy('INVALID' as Platform);
      } catch (error) {
        // Expected to throw
      }

      // Valid strategy should still be cached and accessible
      const sameValidStrategy = DiscountStrategyFactory.getStrategy(Platform.HOTMART);
      expect(validStrategy).toBe(sameValidStrategy);

      const stats = DiscountStrategyFactory.getStatistics();
      expect(stats.cachedStrategies).toContain(Platform.HOTMART);
    });
  });
});
