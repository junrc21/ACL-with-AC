// Mock the logger before importing anything
jest.mock('../../../../../src/shared/utils/logger', () => ({
  createPlatformLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { HotmartProductStrategy } from '../../../../../src/modules/acl/strategies/hotmart/HotmartProductStrategy';
import { Platform } from '../../../../../src/shared/types/platform.types';
import { ProductType, ProductStatus } from '../../../../../src/shared/types/product.types';

describe('HotmartProductStrategy', () => {
  let strategy: HotmartProductStrategy;

  beforeEach(() => {
    strategy = new HotmartProductStrategy();
  });

  describe('parseProductFromSales', () => {
    it('should parse Hotmart sales data correctly', async () => {
      const salesData = {
        product: {
          name: 'Test Course',
          id: 12345,
        },
        buyer: {
          name: 'John Doe',
          ucode: 'buyer123',
          email: 'john@example.com',
        },
        producer: {
          name: 'Producer Name',
          ucode: 'producer123',
        },
        purchase: {
          transaction: 'HP12455690122399',
          order_date: 1640995200000, // 2022-01-01
          approved_date: 1640995200000,
          status: 'APPROVED',
          price: {
            value: 99.99,
            currency_code: 'USD',
          },
          payment: {
            method: 'CREDIT_CARD',
            installments_number: 1,
            type: 'SINGLE',
          },
        },
      };

      const context = {
        platform: Platform.HOTMART,
        storeId: 'test-store',
        headers: { 'x-source-platform': 'HOTMART' },
        timestamp: new Date(),
      };

      const result = await strategy.parseProductFromSales(salesData, context);

      expect(result).toEqual({
        platform: Platform.HOTMART,
        externalId: '12345',
        storeId: 'test-store',
        name: 'Test Course',
        type: ProductType.DIGITAL,
        status: ProductStatus.ACTIVE,
        regularPrice: 99.99,
        currency: 'USD',
        manageStock: false,
        stockQuantity: null,
        weight: null,
        length: null,
        width: null,
        height: null,
        catalogVisibility: 'visible',
        metadata: expect.objectContaining({
          transaction: 'HP12455690122399',
          orderDate: 1640995200000,
          approvedDate: 1640995200000,
          purchaseStatus: 'APPROVED',
          paymentMethod: 'CREDIT_CARD',
          installments: 1,
          isSubscription: false,
          producer: salesData.producer,
          buyer: salesData.buyer,
        }),
        createdAt: new Date(1640995200000),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('parseProductFromCatalog', () => {
    it('should parse Hotmart catalog data correctly', async () => {
      const catalogData = {
        id: 12345,
        name: 'Test Course',
        ucode: 'course123',
        status: 'ACTIVE',
        format: 'ONLINE_COURSE',
        is_subscription: true,
        warranty_period: 30,
        created_at: 1640995200000,
      };

      const context = {
        platform: Platform.HOTMART,
        storeId: 'test-store',
        headers: { 'x-source-platform': 'HOTMART' },
        timestamp: new Date(),
      };

      const result = await strategy.parseProductFromCatalog(catalogData, context);

      expect(result).toEqual({
        platform: Platform.HOTMART,
        externalId: '12345',
        storeId: 'test-store',
        name: 'Test Course',
        type: ProductType.DIGITAL,
        status: ProductStatus.ACTIVE,
        manageStock: false,
        stockQuantity: null,
        weight: null,
        length: null,
        width: null,
        height: null,
        catalogVisibility: 'visible',
        featured: true, // Because it's a subscription
        metadata: expect.objectContaining({
          ucode: 'course123',
          format: 'ONLINE_COURSE',
          isSubscription: true,
          warrantyPeriod: 30,
          originalStatus: 'ACTIVE',
        }),
        createdAt: new Date(1640995200000),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('validateProductData', () => {
    it('should validate sales data correctly', () => {
      const validSalesData = {
        product: { id: 123, name: 'Test' },
        buyer: { name: 'John', ucode: 'buyer123', email: 'john@test.com' },
        purchase: {
          price: { value: 99.99, currency_code: 'USD' },
        },
      };

      const result = strategy.validateProductData(validSalesData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate catalog data correctly', () => {
      const validCatalogData = {
        id: 123,
        name: 'Test Course',
      };

      const result = strategy.validateProductData(validCatalogData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        invalid: 'data',
      };

      const result = strategy.validateProductData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Hotmart product data format');
    });
  });

  describe('mapHotmartStatus', () => {
    it('should map Hotmart statuses correctly', () => {
      expect(strategy.mapHotmartStatus('ACTIVE')).toBe(ProductStatus.ACTIVE);
      expect(strategy.mapHotmartStatus('DRAFT')).toBe(ProductStatus.DRAFT);
      expect(strategy.mapHotmartStatus('PAUSED')).toBe(ProductStatus.INACTIVE);
      expect(strategy.mapHotmartStatus('DELETED')).toBe(ProductStatus.ARCHIVED);
      expect(strategy.mapHotmartStatus('UNKNOWN')).toBe(ProductStatus.ACTIVE);
    });
  });

  describe('mapHotmartFormat', () => {
    it('should map Hotmart formats correctly', () => {
      expect(strategy.mapHotmartFormat('EBOOK')).toBe(ProductType.DIGITAL);
      expect(strategy.mapHotmartFormat('ONLINE_COURSE')).toBe(ProductType.DIGITAL);
      expect(strategy.mapHotmartFormat('ETICKET')).toBe(ProductType.SERVICE);
      expect(strategy.mapHotmartFormat('BUNDLE')).toBe(ProductType.GROUPED);
      expect(strategy.mapHotmartFormat('PHYSICAL')).toBe(ProductType.PHYSICAL);
      expect(strategy.mapHotmartFormat('UNKNOWN')).toBe(ProductType.DIGITAL);
    });
  });

  describe('extractStoreInfo', () => {
    it('should extract store info from producer data', () => {
      const data = {
        producer: {
          ucode: 'producer123',
          name: 'Producer Name',
        },
      };

      const result = strategy.extractStoreInfo(data);

      expect(result).toEqual({
        storeId: 'producer123',
        storeName: 'Producer Name',
      });
    });

    it('should return empty object when no producer data', () => {
      const data = {};

      const result = strategy.extractStoreInfo(data);

      expect(result).toEqual({});
    });
  });

  describe('applyBusinessRules', () => {
    it('should apply Hotmart business rules correctly', () => {
      const productData = {
        platform: Platform.HOTMART,
        externalId: '123',
        name: 'Test Product',
        type: ProductType.SIMPLE,
        status: ProductStatus.ACTIVE,
      };

      const result = strategy.applyBusinessRules(productData);

      expect(result.type).toBe(ProductType.DIGITAL);
      expect(result.currency).toBe('USD');
      expect(result.manageStock).toBe(false);
      expect(result.stockQuantity).toBeNull();
      expect(result.catalogVisibility).toBe('visible');
    });
  });
});
