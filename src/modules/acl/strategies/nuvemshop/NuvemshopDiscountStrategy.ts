import { 
  CouponData, 
  CouponStatus,
  DiscountType,
  DiscountScope,
  NuvemshopDiscountData,
  CouponValidationResult,
  DiscountApplicationResult
} from '@/shared/types/discount.types';
import { Platform, StrategyContext, ValidationResult } from '@/shared/types/platform.types';
import { INuvemshopDiscountStrategy, DiscountValidationResult } from '../interfaces/IDiscountStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Nuvemshop discount strategy implementation
 * Handles Nuvemshop-specific discount management and application
 */
export class NuvemshopDiscountStrategy implements INuvemshopDiscountStrategy {
  public readonly platform = Platform.NUVEMSHOP;
  private logger = createPlatformLogger('NUVEMSHOP', 'DiscountStrategy');

  /**
   * Parse Nuvemshop discount data into unified format
   */
  async parseCoupon(data: NuvemshopDiscountData, context: StrategyContext): Promise<CouponData> {
    this.logger.debug({ data, context }, 'Parsing Nuvemshop discount data');

    const coupon: CouponData = {
      platform: Platform.NUVEMSHOP,
      externalId: data.id.toString(),
      storeId: context.storeId,

      // Coupon identification
      code: data.coupon_code || `DISCOUNT_${data.id}`,
      name: data.coupon_code || `Discount ${data.id}`,
      description: undefined,

      // Discount configuration
      type: this.mapNuvemshopType(data.type),
      amount: parseFloat(data.value),
      scope: this.mapAppliesTo(data.applies_to),

      // Usage restrictions
      restrictions: {
        usageLimit: data.usage_limit || undefined,
        usedCount: data.used || 0,
        minimumAmount: data.min_price ? parseFloat(data.min_price) : undefined,
        allowedProducts: data.applies_to === 'products' ? data.applies_to_resource : undefined,
        allowedCategories: data.applies_to === 'categories' ? data.applies_to_resource : undefined,
      },

      // Validity period
      startsAt: data.start_date ? new Date(data.start_date) : undefined,
      expiresAt: data.end_date ? new Date(data.end_date) : undefined,

      // Status and tracking
      status: this.determineStatus(data),
      usedCount: data.used || 0,

      // Nuvemshop-specific metadata
      metadata: {
        nuvemshopId: data.id,
        appliesTo: data.applies_to,
        appliesToResource: data.applies_to_resource,
        minPrice: data.min_price,
        originalType: data.type,
      },

      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    // Apply business rules
    return this.applyBusinessRules(coupon);
  }

  /**
   * Validate Nuvemshop discount data
   */
  validateCouponData(data: any): DiscountValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.type || !['percentage', 'absolute'].includes(data.type)) {
      errors.push('Discount type must be either "percentage" or "absolute"');
    }

    if (data.value === undefined || data.value === null) {
      errors.push('Discount value is required');
    } else {
      const value = parseFloat(data.value);
      if (isNaN(value) || value <= 0) {
        errors.push('Discount value must be a positive number');
      }
      
      if (data.type === 'percentage' && value > 100) {
        errors.push('Percentage discount cannot exceed 100%');
      }
    }

    // Date validation
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (startDate >= endDate) {
        errors.push('Start date must be before end date');
      }
    }

    if (data.end_date && new Date(data.end_date) < new Date()) {
      warnings.push('Discount end date is in the past');
    }

    // Usage limit validation
    if (data.usage_limit !== undefined && data.usage_limit !== null) {
      const usageLimit = parseInt(data.usage_limit);
      if (isNaN(usageLimit) || usageLimit < 0) {
        errors.push('Usage limit must be a non-negative integer');
      }
    }

    // Minimum price validation
    if (data.min_price !== undefined && data.min_price !== null) {
      const minPrice = parseFloat(data.min_price);
      if (isNaN(minPrice) || minPrice < 0) {
        errors.push('Minimum price must be a non-negative number');
      }
    }

    // Applies to validation
    if (data.applies_to && !['all', 'products', 'categories'].includes(data.applies_to)) {
      errors.push('Applies to must be "all", "products", or "categories"');
    }

    if (data.applies_to !== 'all' && (!data.applies_to_resource || !Array.isArray(data.applies_to_resource))) {
      errors.push('Applies to resource must be an array when applies_to is not "all"');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      discountSpecificErrors: {
        amountInvalid: data.value <= 0 || (data.type === 'percentage' && data.value > 100),
        dateInvalid: data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date),
        expired: data.end_date && new Date(data.end_date) < new Date(),
        usageLimitExceeded: data.usage_limit && data.used >= data.usage_limit,
      }
    };
  }

  /**
   * Extract store information from discount data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // Nuvemshop discounts are store-specific
    // Store ID should be provided in context or extracted from API endpoint
    return {
      storeId: data.store_id?.toString() || undefined,
      storeName: data.store_name || undefined
    };
  }

  /**
   * Apply Nuvemshop-specific business rules
   */
  applyBusinessRules(couponData: CouponData): CouponData {
    // 1. Set default scope based on applies_to
    if (!couponData.scope) {
      couponData.scope = couponData.metadata?.appliesTo === 'all' ? 
        DiscountScope.CART : DiscountScope.PRODUCT;
    }

    // 2. Ensure proper status based on dates and usage
    const now = new Date();
    
    if (couponData.expiresAt && now > couponData.expiresAt) {
      couponData.status = CouponStatus.EXPIRED;
    } else if (couponData.startsAt && now < couponData.startsAt) {
      couponData.status = CouponStatus.PENDING;
    } else if (couponData.restrictions?.usageLimit && 
               couponData.usedCount && 
               couponData.usedCount >= couponData.restrictions.usageLimit) {
      couponData.status = CouponStatus.USED;
    }

    // 3. Set default currency for Latin American markets
    if (!couponData.metadata?.currency) {
      couponData.metadata = {
        ...couponData.metadata,
        currency: 'ARS' // Default for Nuvemshop (Argentina)
      };
    }

    this.logger.debug({ couponData }, 'Applied Nuvemshop business rules');
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

    // Check usage limits
    if (coupon.restrictions?.usageLimit && 
        coupon.usedCount && 
        coupon.usedCount >= coupon.restrictions.usageLimit) {
      errors.push('Coupon usage limit exceeded');
    }

    // Check minimum price
    const orderAmount = context.metadata?.orderAmount || 0;
    if (!this.validateMinimumPrice(coupon, orderAmount)) {
      errors.push(`Order amount must be at least ${coupon.restrictions?.minimumAmount}`);
    }

    // Check product/category applicability
    const productIds = context.metadata?.productIds || [];
    const categoryIds = context.metadata?.categoryIds || [];
    if (!this.validateApplicability(coupon, productIds, categoryIds)) {
      errors.push('Coupon is not applicable to the selected products or categories');
    }

    const discountAmount = this.calculateDiscountAmount(coupon, orderAmount);

    return {
      isValid: errors.length === 0,
      coupon,
      errors,
      warnings,
      discountAmount,
      metadata: {
        platform: Platform.NUVEMSHOP,
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
        currency: orderData.currency || 'ARS',
        errors: validation.errors,
        warnings: validation.warnings,
        metadata: {
          platform: Platform.NUVEMSHOP,
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
      currency: orderData.currency || 'ARS',
      appliedCoupons: [coupon.code],
      metadata: {
        platform: Platform.NUVEMSHOP,
        couponCode: coupon.code,
        discountType: coupon.type,
        discountAmount: coupon.amount
      }
    };
  }

  // Platform-specific methods

  /**
   * Map Nuvemshop discount type to unified type
   */
  mapNuvemshopType(type: 'percentage' | 'absolute'): DiscountType {
    switch (type) {
      case 'percentage':
        return DiscountType.PERCENTAGE;
      case 'absolute':
        return DiscountType.FIXED_CART;
      default:
        return DiscountType.FIXED_CART;
    }
  }

  /**
   * Handle minimum price restrictions
   */
  validateMinimumPrice(coupon: CouponData, orderAmount: number): boolean {
    if (!coupon.restrictions?.minimumAmount) {
      return true;
    }
    return orderAmount >= coupon.restrictions.minimumAmount;
  }

  /**
   * Handle product/category restrictions
   */
  validateApplicability(coupon: CouponData, products: string[], categories: string[]): boolean {
    const appliesTo = coupon.metadata?.appliesTo;
    
    if (appliesTo === 'all') {
      return true;
    }
    
    if (appliesTo === 'products') {
      const allowedProducts = coupon.restrictions?.allowedProducts || [];
      return products.some(productId => allowedProducts.includes(productId));
    }
    
    if (appliesTo === 'categories') {
      const allowedCategories = coupon.restrictions?.allowedCategories || [];
      return categories.some(categoryId => allowedCategories.includes(categoryId));
    }
    
    return false;
  }

  /**
   * Parse multi-language coupon names
   */
  parseLocalizedName(name: Record<string, string> | string): string {
    if (typeof name === 'string') {
      return name;
    }
    
    // Try common languages in order of preference
    const languages = ['en', 'es', 'pt', 'pt-BR'];
    for (const lang of languages) {
      if (name[lang]) {
        return name[lang];
      }
    }
    
    // Return first available language
    const firstKey = Object.keys(name)[0];
    return firstKey ? name[firstKey] : 'Discount';
  }

  // Private helper methods

  private mapAppliesTo(appliesTo?: string): DiscountScope {
    switch (appliesTo) {
      case 'all':
        return DiscountScope.CART;
      case 'products':
        return DiscountScope.PRODUCT;
      case 'categories':
        return DiscountScope.CATEGORY;
      default:
        return DiscountScope.CART;
    }
  }

  private determineStatus(data: NuvemshopDiscountData): CouponStatus {
    const now = new Date();
    
    if (data.end_date && new Date(data.end_date) < now) {
      return CouponStatus.EXPIRED;
    }
    
    if (data.start_date && new Date(data.start_date) > now) {
      return CouponStatus.PENDING;
    }
    
    if (data.usage_limit && data.used >= data.usage_limit) {
      return CouponStatus.USED;
    }
    
    return CouponStatus.ACTIVE;
  }

  private calculateDiscountAmount(coupon: CouponData, orderAmount: number): number {
    if (coupon.type === DiscountType.PERCENTAGE) {
      return (orderAmount * coupon.amount) / 100;
    }
    return Math.min(coupon.amount, orderAmount);
  }
}
