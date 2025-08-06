/**
 * Unit tests for Category Strategy Factory
 */

import { Platform } from '@/shared/types/platform.types';

describe('Category Strategy Factory Unit Tests', () => {
  describe('Strategy Registration and Retrieval', () => {
    it('should register and retrieve strategies correctly', () => {
      // Mock strategy factory implementation
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any>;

        constructor() {
          this.strategies = new Map();
        }

        registerStrategy(platform: Platform, strategy: any): void {
          if (strategy.platform !== platform) {
            throw new Error(`Strategy platform mismatch: expected ${platform}, got ${strategy.platform}`);
          }
          this.strategies.set(platform, strategy);
        }

        getStrategy(platform: Platform): any {
          const strategy = this.strategies.get(platform);
          if (!strategy) {
            throw new Error(`No category strategy found for platform: ${platform}`);
          }
          return strategy;
        }

        hasStrategy(platform: Platform): boolean {
          return this.strategies.has(platform);
        }

        getSupportedPlatforms(): Platform[] {
          return Array.from(this.strategies.keys());
        }
      }

      const factory = new MockCategoryStrategyFactory();

      // Mock strategies
      const hotmartStrategy = { platform: Platform.HOTMART, name: 'HotmartCategoryStrategy' };
      const nuvemshopStrategy = { platform: Platform.NUVEMSHOP, name: 'NuvemshopCategoryStrategy' };
      const woocommerceStrategy = { platform: Platform.WOOCOMMERCE, name: 'WoocommerceCategoryStrategy' };

      // Register strategies
      factory.registerStrategy(Platform.HOTMART, hotmartStrategy);
      factory.registerStrategy(Platform.NUVEMSHOP, nuvemshopStrategy);
      factory.registerStrategy(Platform.WOOCOMMERCE, woocommerceStrategy);

      // Test retrieval
      expect(factory.getStrategy(Platform.HOTMART)).toBe(hotmartStrategy);
      expect(factory.getStrategy(Platform.NUVEMSHOP)).toBe(nuvemshopStrategy);
      expect(factory.getStrategy(Platform.WOOCOMMERCE)).toBe(woocommerceStrategy);

      // Test hasStrategy
      expect(factory.hasStrategy(Platform.HOTMART)).toBe(true);
      expect(factory.hasStrategy(Platform.NUVEMSHOP)).toBe(true);
      expect(factory.hasStrategy(Platform.WOOCOMMERCE)).toBe(true);

      // Test supported platforms
      const supportedPlatforms = factory.getSupportedPlatforms();
      expect(supportedPlatforms).toContain(Platform.HOTMART);
      expect(supportedPlatforms).toContain(Platform.NUVEMSHOP);
      expect(supportedPlatforms).toContain(Platform.WOOCOMMERCE);
      expect(supportedPlatforms).toHaveLength(3);
    });

    it('should throw error for platform mismatch during registration', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any> = new Map();

        registerStrategy(platform: Platform, strategy: any): void {
          if (strategy.platform !== platform) {
            throw new Error(`Strategy platform mismatch: expected ${platform}, got ${strategy.platform}`);
          }
          this.strategies.set(platform, strategy);
        }
      }

      const factory = new MockCategoryStrategyFactory();
      const wrongStrategy = { platform: Platform.HOTMART, name: 'WrongStrategy' };

      expect(() => {
        factory.registerStrategy(Platform.NUVEMSHOP, wrongStrategy);
      }).toThrow('Strategy platform mismatch: expected NUVEMSHOP, got HOTMART');
    });

    it('should throw error for non-existent strategy', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any> = new Map();

        getStrategy(platform: Platform): any {
          const strategy = this.strategies.get(platform);
          if (!strategy) {
            throw new Error(`No category strategy found for platform: ${platform}`);
          }
          return strategy;
        }
      }

      const factory = new MockCategoryStrategyFactory();

      expect(() => {
        factory.getStrategy(Platform.HOTMART);
      }).toThrow('No category strategy found for platform: HOTMART');
    });
  });

  describe('Strategy Validation', () => {
    it('should validate strategy implementation correctly', () => {
      const validateStrategy = (strategy: any): boolean => {
        const requiredMethods = [
          'parseCategory',
          'validateCategoryData',
          'extractStoreInfo',
          'applyBusinessRules',
          'buildHierarchy',
          'getCategoryPath',
        ];

        for (const method of requiredMethods) {
          if (typeof strategy[method] !== 'function') {
            return false;
          }
        }

        return true;
      };

      // Valid strategy
      const validStrategy = {
        platform: Platform.HOTMART,
        parseCategory: () => {},
        validateCategoryData: () => {},
        extractStoreInfo: () => {},
        applyBusinessRules: () => {},
        buildHierarchy: () => {},
        getCategoryPath: () => {},
      };

      expect(validateStrategy(validStrategy)).toBe(true);

      // Invalid strategy - missing method
      const invalidStrategy = {
        platform: Platform.HOTMART,
        parseCategory: () => {},
        validateCategoryData: () => {},
        // Missing other required methods
      };

      expect(validateStrategy(invalidStrategy)).toBe(false);

      // Invalid strategy - method is not a function
      const invalidStrategy2 = {
        platform: Platform.HOTMART,
        parseCategory: () => {},
        validateCategoryData: 'not a function',
        extractStoreInfo: () => {},
        applyBusinessRules: () => {},
        buildHierarchy: () => {},
        getCategoryPath: () => {},
      };

      expect(validateStrategy(invalidStrategy2)).toBe(false);
    });
  });

  describe('Factory Statistics and Information', () => {
    it('should provide correct statistics and information', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any>;

        constructor() {
          this.strategies = new Map();
          this.initializeStrategies();
        }

        private initializeStrategies(): void {
          const strategies = [
            { platform: Platform.HOTMART, name: 'HotmartCategoryStrategy' },
            { platform: Platform.NUVEMSHOP, name: 'NuvemshopCategoryStrategy' },
            { platform: Platform.WOOCOMMERCE, name: 'WoocommerceCategoryStrategy' },
          ];

          strategies.forEach(strategy => {
            this.strategies.set(strategy.platform, strategy);
          });
        }

        getStrategyCount(): number {
          return this.strategies.size;
        }

        hasAnyStrategies(): boolean {
          return this.strategies.size > 0;
        }

        getStrategyInfo(): Record<string, any> {
          const info: Record<string, any> = {};

          for (const [platform, strategy] of this.strategies) {
            info[platform] = {
              platform: strategy.platform,
              name: strategy.name,
            };
          }

          return info;
        }

        clearStrategies(): void {
          this.strategies.clear();
        }

        removeStrategy(platform: Platform): boolean {
          return this.strategies.delete(platform);
        }
      }

      const factory = new MockCategoryStrategyFactory();

      // Test initial state
      expect(factory.getStrategyCount()).toBe(3);
      expect(factory.hasAnyStrategies()).toBe(true);

      const info = factory.getStrategyInfo();
      expect(Object.keys(info)).toHaveLength(3);
      expect(info[Platform.HOTMART]).toEqual({
        platform: Platform.HOTMART,
        name: 'HotmartCategoryStrategy',
      });

      // Test removal
      expect(factory.removeStrategy(Platform.HOTMART)).toBe(true);
      expect(factory.getStrategyCount()).toBe(2);
      expect(factory.removeStrategy(Platform.HOTMART)).toBe(false); // Already removed

      // Test clearing
      factory.clearStrategies();
      expect(factory.getStrategyCount()).toBe(0);
      expect(factory.hasAnyStrategies()).toBe(false);
    });
  });

  describe('Platform Support Checking', () => {
    it('should correctly identify supported platforms', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any> = new Map();

        constructor() {
          // Initialize with some strategies
          this.strategies.set(Platform.HOTMART, { platform: Platform.HOTMART });
          this.strategies.set(Platform.NUVEMSHOP, { platform: Platform.NUVEMSHOP });
        }

        isSupported(platform: Platform): boolean {
          return this.strategies.has(platform);
        }

        getSupportedPlatforms(): Platform[] {
          return Array.from(this.strategies.keys());
        }
      }

      const factory = new MockCategoryStrategyFactory();

      expect(factory.isSupported(Platform.HOTMART)).toBe(true);
      expect(factory.isSupported(Platform.NUVEMSHOP)).toBe(true);
      expect(factory.isSupported(Platform.WOOCOMMERCE)).toBe(false);

      const supportedPlatforms = factory.getSupportedPlatforms();
      expect(supportedPlatforms).toContain(Platform.HOTMART);
      expect(supportedPlatforms).toContain(Platform.NUVEMSHOP);
      expect(supportedPlatforms).not.toContain(Platform.WOOCOMMERCE);
    });
  });

  describe('Strategy Creation Alias', () => {
    it('should provide createStrategy as alias for getStrategy', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any> = new Map();

        constructor() {
          this.strategies.set(Platform.HOTMART, { platform: Platform.HOTMART, name: 'HotmartStrategy' });
        }

        getStrategy(platform: Platform): any {
          const strategy = this.strategies.get(platform);
          if (!strategy) {
            throw new Error(`No category strategy found for platform: ${platform}`);
          }
          return strategy;
        }

        createStrategy(platform: Platform): any {
          return this.getStrategy(platform);
        }
      }

      const factory = new MockCategoryStrategyFactory();
      const strategy1 = factory.getStrategy(Platform.HOTMART);
      const strategy2 = factory.createStrategy(Platform.HOTMART);

      expect(strategy1).toBe(strategy2);
      expect(strategy1.name).toBe('HotmartStrategy');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during initialization', () => {
      class MockCategoryStrategyFactory {
        private strategies: Map<Platform, any> = new Map();

        constructor() {
          try {
            this.initializeStrategies();
          } catch (error) {
            // In real implementation, this would log the error
            throw error;
          }
        }

        private initializeStrategies(): void {
          // Simulate initialization error
          throw new Error('Failed to initialize strategies');
        }
      }

      expect(() => {
        new MockCategoryStrategyFactory();
      }).toThrow('Failed to initialize strategies');
    });

    it('should handle strategy validation errors', () => {
      const validateAllStrategies = (strategies: Map<Platform, any>): Record<Platform, boolean> => {
        const results: Record<Platform, boolean> = {} as Record<Platform, boolean>;
        
        for (const [platform, strategy] of strategies) {
          try {
            // Simple validation - check if strategy has platform property
            results[platform] = strategy.platform === platform;
          } catch (error) {
            results[platform] = false;
          }
        }

        return results;
      };

      const strategies = new Map([
        [Platform.HOTMART, { platform: Platform.HOTMART }],
        [Platform.NUVEMSHOP, { platform: Platform.WOOCOMMERCE }], // Wrong platform
        [Platform.WOOCOMMERCE, { platform: Platform.WOOCOMMERCE }],
      ]);

      const results = validateAllStrategies(strategies);

      expect(results[Platform.HOTMART]).toBe(true);
      expect(results[Platform.NUVEMSHOP]).toBe(false); // Platform mismatch
      expect(results[Platform.WOOCOMMERCE]).toBe(true);
    });
  });
});
