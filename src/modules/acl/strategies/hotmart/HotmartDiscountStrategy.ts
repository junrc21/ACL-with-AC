import { 
  CouponData, 
  CouponStatus,
  DiscountType,
  DiscountScope,
  HotmartCouponData,
  CouponValidationResult,
  DiscountApplicationResult
} from '@/shared/types/discount.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IHotmartDiscountStrategy, DiscountValidationResult } from '../interfaces/IDiscountStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Hotmart discount strategy implementation
 * Handles Hotmart-specific coupon management and discount application
 */
export class HotmartDiscountStrategy implements IHotmartDiscountStrategy {
  public readonly platform = Platform.HOTMART;
  private logger = createPlatformLogger('HOTMART', 'DiscountStrategy');

  /**
   * Parse Hotmart coupon data into unified format
   */
  async parseCoupon(data: HotmartCouponData, context: StrategyContext): Promise<CouponData> {
    this.logger.debug({ data, context }, 'Parsing Hotmart coupon data');

    const coupon: CouponData = {
      platform: Platform.HOTMART,
      externalId: data.id?.toString(),
      storeId: context.storeId,

      // Coupon identification
      code: data.code,
      name: data.code, // Hotmart doesn't have separate names
      description: undefined,

      // Discount configuration
      type: DiscountType.PERCENTAGE,
      amount: this.mapHotmartDiscount(data.discount),
      scope: DiscountScope.CART,

      // Usage restrictions
      restrictions: {
        metadata: {
          affiliate: data.affiliate,
          offerIds: data.offer_ids,
        }
      },

      // Validity period
      startsAt: data.start_date ? new Date(data.start_date) : undefined,
      expiresAt: data.end_date ? new Date(data.end_date) : undefined,

      // Status and tracking
      status: this.mapHotmartStatus(data.status || (data.active ? 'valid' : 'inactive')),
      usedCount: 0, // Hotmart doesn't provide usage count in API

      // Hotmart-specific metadata
      metadata: {
        hotmartId: data.id,
        active: data.active,
        originalStatus: data.status,
        timeZone: data.time_zone,
        affiliate: data.affiliate,
        offerIds: data.offer_ids,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Apply business rules
    return this.applyBusinessRules(coupon);
  }

  /**
   * Validate Hotmart coupon data
   */
  validateCouponData(data: any): DiscountValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.code || typeof data.code !== 'string') {
      errors.push('Coupon code is required and must be a string');
    } else if (data.code.length > 25) {
      errors.push('Coupon code must not exceed 25 characters');
    }

    if (data.discount === undefined || data.discount === null) {
      errors.push('Discount value is required');
    } else if (typeof data.discount !== 'number') {
      errors.push('Discount must be a number');
    } else if (data.discount <= 0 || data.discount >= 0.99) {
      errors.push('Discount must be greater than 0 and less than 0.99');
    }

    // Date validation
    if (data.start_date && data.end_date) {
      if (data.start_date >= data.end_date) {
        errors.push('Start date must be before end date');
      }
    }

    if (data.end_date && data.end_date < Date.now()) {
      warnings.push('Coupon end date is in the past');
    }

    // Optional field validation
    if (data.affiliate && typeof data.affiliate !== 'string') {
      errors.push('Affiliate ID must be a string');
    }

    if (data.offer_ids && !Array.isArray(data.offer_ids)) {
      errors.push('Offer IDs must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      discountSpecificErrors: {
        codeRequired: !data.code,
        amountInvalid: data.discount <= 0 || data.discount >= 0.99,
        dateInvalid: data.start_date && data.end_date && data.start_date >= data.end_date,
        expired: data.end_date && data.end_date < Date.now(),
        inactive: data.active === false,
      }
    };
  }

  /**
   * Extract store information from coupon data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // Hotmart coupons are product-specific, not store-specific
    // We use 'hotmart' as a default store identifier
    return {
      storeId: 'hotmart',
      storeName: 'Hotmart Store'
    };
  }

  /**
   * Apply Hotmart-specific business rules
   */
  applyBusinessRules(couponData: CouponData): CouponData {
    // 1. Hotmart only supports percentage discounts
    couponData.type = DiscountType.PERCENTAGE;
    couponData.scope = DiscountScope.CART;

    // 2. Set default status if not provided
    if (!couponData.status) {
      couponData.status = CouponStatus.ACTIVE;
    }

    // 3. Ensure amount is in percentage format (0-99)
    if (couponData.amount < 1) {
      couponData.amount = couponData.amount * 100;
    }

    // 4. Set restrictions based on metadata
    if (couponData.metadata?.affiliate) {
      couponData.restrictions = {
        ...couponData.restrictions,
        metadata: {
          ...couponData.restrictions?.metadata,
          affiliateRestricted: true,
          allowedAffiliates: [couponData.metadata.affiliate]
        }
      };
    }

    if (couponData.metadata?.offerIds && Array.isArray(couponData.metadata.offerIds)) {
      couponData.restrictions = {
        ...couponData.restrictions,
        metadata: {
          ...couponData.restrictions?.metadata,
          offerRestricted: true,
          allowedOffers: couponData.metadata.offerIds
        }
      };
    }

    this.logger.debug({ couponData }, 'Applied Hotmart business rules');
    return couponData;
  }

  /**
   * Validate coupon for usage
   */
  async validateCouponUsage(coupon: CouponData, context: StrategyContext): Promise<CouponValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if coupon is active
    if (coupon.status !== CouponStatus.ACTIVE) {
      errors.push(`Coupon is ${coupon.status}`);
    }

    // Check expiration
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      errors.push('Coupon has expired');
    }

    // Check start date
    if (coupon.startsAt && new Date() < coupon.startsAt) {
      errors.push('Coupon is not yet active');
    }

    // Check affiliate restrictions
    if (coupon.restrictions?.metadata?.affiliateRestricted) {
      const affiliateId = context.metadata?.affiliateId;
      if (!this.validateAffiliateRestriction(coupon, affiliateId)) {
        errors.push('Coupon is restricted to specific affiliates');
      }
    }

    // Check offer restrictions
    if (coupon.restrictions?.metadata?.offerRestricted) {
      const offerIds = context.metadata?.offerIds;
      if (!this.validateOfferRestriction(coupon, offerIds)) {
        errors.push('Coupon is restricted to specific offers');
      }
    }

    const discountAmount = this.calculateDiscountAmount(coupon, context.metadata?.orderAmount || 0);

    return {
      isValid: errors.length === 0,
      coupon,
      errors,
      warnings,
      discountAmount,
      metadata: {
        platform: Platform.HOTMART,
        validationTime: new Date().toISOString()
      }
    };
  }

  /**
   * Apply discount to order/cart
   */
  async applyDiscount(coupon: CouponData, orderData: any, context: StrategyContext): Promise<DiscountApplicationResult> {
    const validation = await this.validateCouponUsage(coupon, context);
    
    if (!validation.isValid) {
      return {
        success: false,
        applied: false,
        discountAmount: 0,
        originalAmount: orderData.amount || 0,
        finalAmount: orderData.amount || 0,
        currency: orderData.currency || 'USD',
        errors: validation.errors,
        warnings: validation.warnings,
        metadata: {
          platform: Platform.HOTMART,
          couponCode: coupon.code
        }
      };
    }

    const originalAmount = orderData.amount || 0;
    const discountAmount = this.calculateDiscountAmount(coupon, originalAmount);
    const finalAmount = Math.max(0, originalAmount - discountAmount);

    return {
      success: true,
      applied: true,
      discountAmount,
      originalAmount,
      finalAmount,
      currency: orderData.currency || 'USD',
      appliedCoupons: [coupon.code],
      metadata: {
        platform: Platform.HOTMART,
        couponCode: coupon.code,
        discountPercentage: coupon.amount
      }
    };
  }

  // Platform-specific methods

  /**
   * Create Hotmart coupon via API
   */
  async createCoupon(productId: string, couponData: CouponData, context: StrategyContext): Promise<HotmartCouponData> {
    // This would make an actual API call to Hotmart
    // For now, return a mock response
    this.logger.info({ productId, couponData }, 'Creating Hotmart coupon');
    
    return {
      id: Math.floor(Math.random() * 1000000),
      code: couponData.code,
      discount: couponData.amount / 100, // Convert back to decimal
      active: couponData.status === CouponStatus.ACTIVE,
      start_date: couponData.startsAt?.getTime(),
      end_date: couponData.expiresAt?.getTime(),
      affiliate: couponData.restrictions?.metadata?.affiliate,
      offer_ids: couponData.restrictions?.metadata?.offerIds,
      status: 'valid'
    };
  }

  /**
   * Get Hotmart coupons for product
   */
  async getCouponsForProduct(productId: string, context: StrategyContext): Promise<HotmartCouponData[]> {
    // This would make an actual API call to Hotmart
    this.logger.info({ productId }, 'Getting Hotmart coupons for product');
    return [];
  }

  /**
   * Map Hotmart discount percentage to unified amount
   */
  mapHotmartDiscount(discount: number): number {
    // Hotmart uses decimal (0.20 = 20%), convert to percentage
    return discount * 100;
  }

  /**
   * Map Hotmart coupon status to unified status
   */
  mapHotmartStatus(status: string): CouponStatus {
    switch (status) {
      case 'valid':
        return CouponStatus.ACTIVE;
      case 'expired':
        return CouponStatus.EXPIRED;
      case 'inactive':
        return CouponStatus.INACTIVE;
      case 'used':
        return CouponStatus.USED;
      default:
        return CouponStatus.INACTIVE;
    }
  }

  /**
   * Handle affiliate restrictions
   */
  validateAffiliateRestriction(coupon: CouponData, affiliateId?: string): boolean {
    if (!coupon.restrictions?.metadata?.affiliateRestricted) {
      return true;
    }

    const allowedAffiliates = coupon.restrictions.metadata.allowedAffiliates;
    return affiliateId && allowedAffiliates && allowedAffiliates.includes(affiliateId);
  }

  /**
   * Handle offer restrictions
   */
  validateOfferRestriction(coupon: CouponData, offerIds?: string[]): boolean {
    if (!coupon.restrictions?.metadata?.offerRestricted) {
      return true;
    }

    const allowedOffers = coupon.restrictions.metadata.allowedOffers;
    if (!offerIds || !allowedOffers) {
      return false;
    }

    return offerIds.some(offerId => allowedOffers.includes(offerId));
  }

  // Private helper methods

  private calculateDiscountAmount(coupon: CouponData, orderAmount: number): number {
    if (coupon.type === DiscountType.PERCENTAGE) {
      return (orderAmount * coupon.amount) / 100;
    }
    return Math.min(coupon.amount, orderAmount);
  }
}
