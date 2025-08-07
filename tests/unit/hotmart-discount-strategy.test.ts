import { HotmartDiscountStrategy } from '@/modules/acl/strategies/hotmart/HotmartDiscountStrategy';
import { Platform } from '@/shared/types/platform.types';
import { DiscountType, CouponStatus, DiscountScope, HotmartCouponData } from '@/shared/types/discount.types';

describe('HotmartDiscountStrategy', () => {
  let strategy: HotmartDiscountStrategy;

  beforeEach(() => {
    strategy = new HotmartDiscountStrategy();
    // Mock the logger
    (strategy as any).logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('Platform identification', () => {
    it('should identify as HOTMART platform', () => {
      expect(strategy.platform).toBe(Platform.HOTMART);
    });
  });

  describe('parseCoupon', () => {
    it('should parse valid Hotmart coupon data', async () => {
      const hotmartData: HotmartCouponData = {
        id: 123,
        code: 'SAVE20',
        discount: 0.20,
        active: true,
        start_date: Date.now(),
        end_date: Date.now() + 86400000, // 24 hours from now
        affiliate: 'affiliate123',
        offer_ids: ['offer1', 'offer2'],
        status: 'valid'
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
      };

      const result = await strategy.parseCoupon(hotmartData, context);

      expect(result).toMatchObject({
        platform: Platform.HOTMART,
        externalId: '123',
        storeId: 'store123',
        code: 'SAVE20',
        type: DiscountType.PERCENTAGE,
        amount: 20, // Converted from 0.20 to 20%
        scope: DiscountScope.CART,
        status: CouponStatus.ACTIVE,
      });

      expect(result.restrictions?.metadata).toMatchObject({
        affiliate: 'affiliate123',
        offerIds: ['offer1', 'offer2'],
      });

      expect(result.metadata).toMatchObject({
        hotmartId: 123,
        active: true,
        affiliate: 'affiliate123',
        offerIds: ['offer1', 'offer2'],
      });
    });

    it('should handle coupon without optional fields', async () => {
      const hotmartData: HotmartCouponData = {
        code: 'BASIC10',
        discount: 0.10,
        active: true,
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
      };

      const result = await strategy.parseCoupon(hotmartData, context);

      expect(result.code).toBe('BASIC10');
      expect(result.amount).toBe(10);
      expect(result.startsAt).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });
  });

  describe('validateCouponData', () => {
    it('should validate correct coupon data', () => {
      const validData = {
        code: 'VALID20',
        discount: 0.20,
        active: true,
      };

      const result = strategy.validateCouponData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject coupon without code', () => {
      const invalidData = {
        discount: 0.20,
        active: true,
      };

      const result = strategy.validateCouponData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Coupon code is required and must be a string');
    });

    it('should reject coupon with invalid discount', () => {
      const invalidData = {
        code: 'INVALID',
        discount: 1.5, // > 0.99
        active: true,
      };

      const result = strategy.validateCouponData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discount must be greater than 0 and less than 0.99');
    });

    it('should reject coupon with code too long', () => {
      const invalidData = {
        code: 'A'.repeat(26), // > 25 characters
        discount: 0.20,
        active: true,
      };

      const result = strategy.validateCouponData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Coupon code must not exceed 25 characters');
    });

    it('should warn about expired coupon', () => {
      const expiredData = {
        code: 'EXPIRED',
        discount: 0.20,
        active: true,
        end_date: Date.now() - 86400000, // 24 hours ago
      };

      const result = strategy.validateCouponData(expiredData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Coupon end date is in the past');
    });
  });

  describe('extractStoreInfo', () => {
    it('should return default Hotmart store info', () => {
      const result = strategy.extractStoreInfo({});

      expect(result).toEqual({
        storeId: 'hotmart',
        storeName: 'Hotmart Store',
      });
    });
  });

  describe('applyBusinessRules', () => {
    it('should apply Hotmart-specific business rules', () => {
      const couponData = {
        platform: Platform.HOTMART,
        code: 'TEST',
        type: DiscountType.FIXED_CART, // Should be changed to PERCENTAGE
        amount: 0.15, // Should be converted to 15
        scope: DiscountScope.PRODUCT, // Should be changed to CART
        status: undefined as any,
        metadata: {
          affiliate: 'aff123',
          offerIds: ['offer1'],
        },
      };

      const result = strategy.applyBusinessRules(couponData as any);

      expect(result.type).toBe(DiscountType.PERCENTAGE);
      expect(result.scope).toBe(DiscountScope.CART);
      expect(result.amount).toBe(15); // Converted from 0.15 to 15%
      expect(result.status).toBe(CouponStatus.ACTIVE);
      expect(result.restrictions?.metadata?.affiliateRestricted).toBe(true);
      expect(result.restrictions?.metadata?.offerRestricted).toBe(true);
    });
  });

  describe('validateCouponUsage', () => {
    it('should validate active coupon', async () => {
      const coupon = {
        platform: Platform.HOTMART,
        code: 'ACTIVE20',
        status: CouponStatus.ACTIVE,
        amount: 20,
        type: DiscountType.PERCENTAGE,
        scope: DiscountScope.CART,
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: { orderAmount: 100 },
      };

      const result = await strategy.validateCouponUsage(coupon as any, context);

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(20); // 20% of 100
    });

    it('should reject expired coupon', async () => {
      const coupon = {
        platform: Platform.HOTMART,
        code: 'EXPIRED20',
        status: CouponStatus.EXPIRED,
        amount: 20,
        type: DiscountType.PERCENTAGE,
        scope: DiscountScope.CART,
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: { orderAmount: 100 },
      };

      const result = await strategy.validateCouponUsage(coupon as any, context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Coupon is expired');
    });

    it('should validate affiliate restrictions', async () => {
      const coupon = {
        platform: Platform.HOTMART,
        code: 'AFFILIATE20',
        status: CouponStatus.ACTIVE,
        amount: 20,
        type: DiscountType.PERCENTAGE,
        scope: DiscountScope.CART,
        restrictions: {
          metadata: {
            affiliateRestricted: true,
            allowedAffiliates: ['aff123'],
          },
        },
      };

      const contextWithValidAffiliate = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: {
          orderAmount: 100,
          affiliateId: 'aff123',
        },
      };

      const validResult = await strategy.validateCouponUsage(coupon as any, contextWithValidAffiliate);
      expect(validResult.isValid).toBe(true);

      const contextWithInvalidAffiliate = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: {
          orderAmount: 100,
          affiliateId: 'aff456',
        },
      };

      const invalidResult = await strategy.validateCouponUsage(coupon as any, contextWithInvalidAffiliate);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Coupon is restricted to specific affiliates');
    });
  });

  describe('applyDiscount', () => {
    it('should apply discount successfully', async () => {
      const coupon = {
        platform: Platform.HOTMART,
        code: 'APPLY20',
        status: CouponStatus.ACTIVE,
        amount: 20,
        type: DiscountType.PERCENTAGE,
        scope: DiscountScope.CART,
      };

      const orderData = {
        amount: 100,
        currency: 'USD',
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: { orderAmount: 100 },
      };

      const result = await strategy.applyDiscount(coupon as any, orderData, context);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.discountAmount).toBe(20);
      expect(result.originalAmount).toBe(100);
      expect(result.finalAmount).toBe(80);
      expect(result.appliedCoupons).toContain('APPLY20');
    });

    it('should not apply invalid coupon', async () => {
      const coupon = {
        platform: Platform.HOTMART,
        code: 'INVALID20',
        status: CouponStatus.EXPIRED,
        amount: 20,
        type: DiscountType.PERCENTAGE,
        scope: DiscountScope.CART,
      };

      const orderData = {
        amount: 100,
        currency: 'USD',
      };

      const context = {
        storeId: 'store123',
        platform: Platform.HOTMART,
        headers: { 'x-source-platform': 'hotmart' },
        timestamp: new Date(),
        metadata: { orderAmount: 100 },
      };

      const result = await strategy.applyDiscount(coupon as any, orderData, context);

      expect(result.success).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(100);
      expect(result.errors).toContain('Coupon is expired');
    });
  });

  describe('Platform-specific methods', () => {
    describe('mapHotmartDiscount', () => {
      it('should convert decimal to percentage', () => {
        expect(strategy.mapHotmartDiscount(0.20)).toBe(20);
        expect(strategy.mapHotmartDiscount(0.05)).toBe(5);
        expect(strategy.mapHotmartDiscount(0.99)).toBe(99);
      });
    });

    describe('mapHotmartStatus', () => {
      it('should map Hotmart statuses to unified statuses', () => {
        expect(strategy.mapHotmartStatus('valid')).toBe(CouponStatus.ACTIVE);
        expect(strategy.mapHotmartStatus('expired')).toBe(CouponStatus.EXPIRED);
        expect(strategy.mapHotmartStatus('inactive')).toBe(CouponStatus.INACTIVE);
        expect(strategy.mapHotmartStatus('used')).toBe(CouponStatus.USED);
        expect(strategy.mapHotmartStatus('unknown')).toBe(CouponStatus.INACTIVE);
      });
    });

    describe('validateAffiliateRestriction', () => {
      it('should validate affiliate restrictions correctly', () => {
        const couponWithRestriction = {
          restrictions: {
            metadata: {
              affiliateRestricted: true,
              allowedAffiliates: ['aff123', 'aff456'],
            },
          },
        };

        expect(strategy.validateAffiliateRestriction(couponWithRestriction as any, 'aff123')).toBe(true);
        expect(strategy.validateAffiliateRestriction(couponWithRestriction as any, 'aff789')).toBe(false);

        const couponWithoutRestriction = {
          restrictions: {},
        };

        expect(strategy.validateAffiliateRestriction(couponWithoutRestriction as any, 'any')).toBe(true);
      });
    });

    describe('validateOfferRestriction', () => {
      it('should validate offer restrictions correctly', () => {
        const couponWithRestriction = {
          restrictions: {
            metadata: {
              offerRestricted: true,
              allowedOffers: ['offer1', 'offer2'],
            },
          },
        };

        expect(strategy.validateOfferRestriction(couponWithRestriction as any, ['offer1'])).toBe(true);
        expect(strategy.validateOfferRestriction(couponWithRestriction as any, ['offer3'])).toBe(false);
        expect(strategy.validateOfferRestriction(couponWithRestriction as any, ['offer1', 'offer3'])).toBe(true);

        const couponWithoutRestriction = {
          restrictions: {},
        };

        expect(strategy.validateOfferRestriction(couponWithoutRestriction as any, ['any'])).toBe(true);
      });
    });
  });
});
