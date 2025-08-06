// Mock the logger before importing anything
jest.mock('../../../../../src/shared/utils/logger', () => ({
  createPlatformLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { ProductStrategyFactory } from '../../../../../src/modules/acl/strategies/factories/ProductStrategyFactory';
import { Platform } from '../../../../../src/shared/types/platform.types';
import { HotmartProductStrategy } from '../../../../../src/modules/acl/strategies/hotmart/HotmartProductStrategy';
import { NuvemshopProductStrategy } from '../../../../../src/modules/acl/strategies/nuvemshop/NuvemshopProductStrategy';
import { WoocommerceProductStrategy } from '../../../../../src/modules/acl/strategies/woocommerce/WoocommerceProductStrategy';

describe('ProductStrategyFactory', () => {
  let factory: ProductStrategyFactory;

  beforeEach(() => {
    factory = new ProductStrategyFactory();
  });

  describe('createStrategy', () => {
    it('should create Hotmart strategy', () => {
      const strategy = factory.createStrategy(Platform.HOTMART);
      expect(strategy).toBeInstanceOf(HotmartProductStrategy);
      expect(strategy.platform).toBe(Platform.HOTMART);
    });

    it('should create Nuvemshop strategy', () => {
      const strategy = factory.createStrategy(Platform.NUVEMSHOP);
      expect(strategy).toBeInstanceOf(NuvemshopProductStrategy);
      expect(strategy.platform).toBe(Platform.NUVEMSHOP);
    });

    it('should create WooCommerce strategy', () => {
      const strategy = factory.createStrategy(Platform.WOOCOMMERCE);
      expect(strategy).toBeInstanceOf(WoocommerceProductStrategy);
      expect(strategy.platform).toBe(Platform.WOOCOMMERCE);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        factory.createStrategy('UNSUPPORTED' as Platform);
      }).toThrow('No product strategy found for platform: UNSUPPORTED');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported platforms', () => {
      expect(factory.isSupported(Platform.HOTMART)).toBe(true);
      expect(factory.isSupported(Platform.NUVEMSHOP)).toBe(true);
      expect(factory.isSupported(Platform.WOOCOMMERCE)).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(factory.isSupported('UNSUPPORTED' as Platform)).toBe(false);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all available strategies', () => {
      const strategies = factory.getAllStrategies();
      
      expect(strategies.size).toBe(3);
      expect(strategies.has(Platform.HOTMART)).toBe(true);
      expect(strategies.has(Platform.NUVEMSHOP)).toBe(true);
      expect(strategies.has(Platform.WOOCOMMERCE)).toBe(true);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return array of supported platforms', () => {
      const platforms = factory.getSupportedPlatforms();
      
      expect(platforms).toHaveLength(3);
      expect(platforms).toContain(Platform.HOTMART);
      expect(platforms).toContain(Platform.NUVEMSHOP);
      expect(platforms).toContain(Platform.WOOCOMMERCE);
    });
  });

  describe('validateStrategy', () => {
    it('should validate strategy implementation', () => {
      expect(factory.validateStrategy(Platform.HOTMART)).toBe(true);
      expect(factory.validateStrategy(Platform.NUVEMSHOP)).toBe(true);
      expect(factory.validateStrategy(Platform.WOOCOMMERCE)).toBe(true);
    });

    it('should return false for non-existent strategy', () => {
      expect(factory.validateStrategy('UNSUPPORTED' as Platform)).toBe(false);
    });
  });

  describe('getStrategyInfo', () => {
    it('should return strategy information', () => {
      const info = factory.getStrategyInfo();
      
      expect(info).toHaveProperty(Platform.HOTMART);
      expect(info).toHaveProperty(Platform.NUVEMSHOP);
      expect(info).toHaveProperty(Platform.WOOCOMMERCE);
      
      expect(info[Platform.HOTMART]).toHaveProperty('platform', Platform.HOTMART);
      expect(info[Platform.HOTMART]).toHaveProperty('className', 'HotmartProductStrategy');
      expect(info[Platform.HOTMART]).toHaveProperty('methods');
      expect(info[Platform.HOTMART].methods).toContain('parseProduct');
    });
  });

  describe('getStatistics', () => {
    it('should return factory statistics', () => {
      const stats = factory.getStatistics();
      
      expect(stats).toHaveProperty('totalStrategies', 3);
      expect(stats).toHaveProperty('supportedPlatforms');
      expect(stats).toHaveProperty('strategyInfo');
      expect(stats.supportedPlatforms).toHaveLength(3);
    });
  });
});
