import { 
  CouponData, 
  CouponStatus,
  DiscountType,
  DiscountScope,
  WooCommerceCouponData,
  CouponValidationResult,
  DiscountApplicationResult
} from '@/shared/types/discount.types';
import { Platform, StrategyContext, ValidationResult } from '@/shared/types/platform.types';
import { IWooCommerceDiscountStrategy, DiscountValidationResult } from '../interfaces/IDiscountStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * WooCommerce discount strategy implementation
 * Handles WooCommerce-specific coupon management and discount application
 */
export class WooCommerceDiscountStrategy implements IWooCommerceDiscountStrategy {
  public readonly platform = Platform.WOOCOMMERCE;
  private logger = createPlatformLogger('WOOCOMMERCE', 'DiscountStrategy');

  /**
   * Parse WooCommerce coupon data into unified format
   */
  async parseCoupon(data: WooCommerceCouponData, context: StrategyContext): Promise<CouponData> {
    this.logger.debug({ data, context }, 'Parsing WooCommerce coupon data');

    const coupon: CouponData = {
      platform: Platform.WOOCOMMERCE,
      externalId: data.id.toString(),
      storeId: context.storeId,

      // Coupon identification
      code: data.code,
      name: data.code,
      description: data.description,

      // Discount configuration
      type: this.mapWooCommerceType(data.discount_type),
      amount: parseFloat(data.amount),
      scope: this.mapDiscountScope(data.discount_type, data.free_shipping),

      // Usage restrictions
      restrictions: {
        usageLimit: data.usage_limit || undefined,
        usageLimitPerUser: data.usage_limit_per_user || undefined,
        usedCount: data.usage_count,
        allowedProducts: data.product_ids.map(id => id.toString()),
        excludedProducts: data.excluded_product_ids.map(id => id.toString()),
        allowedCategories: data.product_categories.map(id => id.toString()),
        excludedCategories: data.excluded_product_categories.map(id => id.toString()),
        minimumAmount: data.minimum_amount ? parseFloat(data.minimum_amount) : undefined,
        maximumAmount: data.maximum_amount ? parseFloat(data.maximum_amount) : undefined,
        allowedUsers: data.email_restrictions,
        metadata: {
          individualUse: data.individual_use,
          excludeSaleItems: data.exclude_sale_items,
          limitUsageToXItems: data.limit_usage_to_x_items,
          freeShipping: data.free_shipping,
          usedBy: data.used_by,
        }
      },

      // Validity period
      startsAt: undefined, // WooCommerce doesn't have start date
      expiresAt: data.date_expires ? new Date(data.date_expires) : undefined,

      // Status and tracking
      status: this.determineStatus(data),
      usedCount: data.usage_count,

      // WooCommerce-specific metadata
      metadata: {
        woocommerceId: data.id,
        individualUse: data.individual_use,
        freeShipping: data.free_shipping,
        excludeSaleItems: data.exclude_sale_items,
        limitUsageToXItems: data.limit_usage_to_x_items,
        metaData: data.meta_data,
        originalDiscountType: data.discount_type,
      },

      createdAt: new Date(data.date_created),
      updatedAt: new Date(data.date_modified),
    };

    // Apply business rules
    return this.applyBusinessRules(coupon);
  }

  /**
   * Validate WooCommerce coupon data
   */
  validateCouponData(data: any): DiscountValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.code || typeof data.code !== 'string') {
      errors.push('Coupon code is required and must be a string');
    }

    if (!data.discount_type || !['percent', 'fixed_cart', 'fixed_product'].includes(data.discount_type)) {
      errors.push('Discount type must be "percent", "fixed_cart", or "fixed_product"');
    }

    if (data.amount === undefined || data.amount === null) {
      errors.push('Discount amount is required');
    } else {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Discount amount must be a non-negative number');
      }
      
      if (data.discount_type === 'percent' && amount > 100) {
        warnings.push('Percentage discount exceeds 100%');
      }
    }

    // Date validation
    if (data.date_expires && new Date(data.date_expires) < new Date()) {
      warnings.push('Coupon expiration date is in the past');
    }

    // Usage limit validation
    if (data.usage_limit !== undefined && data.usage_limit !== null) {
      const usageLimit = parseInt(data.usage_limit);
      if (isNaN(usageLimit) || usageLimit < 0) {
        errors.push('Usage limit must be a non-negative integer');
      }
    }

    if (data.usage_limit_per_user !== undefined && data.usage_limit_per_user !== null) {
      const usageLimitPerUser = parseInt(data.usage_limit_per_user);
      if (isNaN(usageLimitPerUser) || usageLimitPerUser < 0) {
        errors.push('Usage limit per user must be a non-negative integer');
      }
    }

    // Amount validation
    if (data.minimum_amount !== undefined && data.minimum_amount !== null) {
      const minAmount = parseFloat(data.minimum_amount);
      if (isNaN(minAmount) || minAmount < 0) {
        errors.push('Minimum amount must be a non-negative number');
      }
    }

    if (data.maximum_amount !== undefined && data.maximum_amount !== null) {
      const maxAmount = parseFloat(data.maximum_amount);
      if (isNaN(maxAmount) || maxAmount < 0) {
        errors.push('Maximum amount must be a non-negative number');
      }
    }

    // Array validation
    if (data.product_ids && !Array.isArray(data.product_ids)) {
      errors.push('Product IDs must be an array');
    }

    if (data.excluded_product_ids && !Array.isArray(data.excluded_product_ids)) {
      errors.push('Excluded product IDs must be an array');
    }

    if (data.email_restrictions && !Array.isArray(data.email_restrictions)) {
      errors.push('Email restrictions must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      discountSpecificErrors: {
        codeRequired: !data.code,
        amountInvalid: data.amount < 0 || (data.discount_type === 'percent' && data.amount > 100),
        expired: data.date_expires && new Date(data.date_expires) < new Date(),
        usageLimitExceeded: data.usage_limit && data.usage_count >= data.usage_limit,
      }
    };
  }

  /**
   * Extract store information from coupon data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // WooCommerce coupons are store-specific
    return {
      storeId: data.store_id?.toString() || 'woocommerce',
      storeName: data.store_name || 'WooCommerce Store'
    };
  }

  /**
   * Apply WooCommerce-specific business rules
   */
  applyBusinessRules(couponData: CouponData): CouponData {
    // 1. Set proper scope based on discount type and free shipping
    if (couponData.metadata?.freeShipping) {
      couponData.scope = DiscountScope.SHIPPING;
    }

    // 2. Handle individual use restriction
    if (couponData.restrictions?.metadata?.individualUse) {
      couponData.restrictions.metadata.canCombineWithOthers = false;
    }

    // 3. Set default status based on expiration and usage
    const now = new Date();
    
    if (couponData.expiresAt && now > couponData.expiresAt) {
      couponData.status = CouponStatus.EXPIRED;
    } else if (couponData.restrictions?.usageLimit && 
               couponData.usedCount && 
               couponData.usedCount >= couponData.restrictions.usageLimit) {
      couponData.status = CouponStatus.USED;
    }

    // 4. Set default currency
    if (!couponData.metadata?.currency) {
      couponData.metadata = {
        ...couponData.metadata,
        currency: 'USD' // Default for WooCommerce
      };
    }

    this.logger.debug({ couponData }, 'Applied WooCommerce business rules');
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

    // Check individual use restriction
    const appliedCoupons = context.metadata?.appliedCoupons || [];
    if (!this.validateIndividualUse(coupon, appliedCoupons)) {
      errors.push('This coupon cannot be used with other coupons');
    }

    // Check usage limits
    if (!this.validateUsageLimits(coupon, context.metadata?.customerId)) {
      errors.push('Coupon usage limit exceeded');
    }

    // Check email restrictions
    if (context.metadata?.customerEmail && 
        !this.validateEmailRestrictions(coupon, context.metadata.customerEmail)) {
      errors.push('Coupon is not valid for this email address');
    }

    // Check product restrictions
    const productIds = (context.metadata?.productIds || []).map(id => parseInt(id.toString()));
    const categoryIds = (context.metadata?.categoryIds || []).map(id => parseInt(id.toString()));
    if (!this.validateProductRestrictions(coupon, productIds, categoryIds)) {
      errors.push('Coupon is not applicable to the selected products or categories');
    }

    // Check minimum/maximum amount
    const orderAmount = context.metadata?.orderAmount || 0;
    if (coupon.restrictions?.minimumAmount && orderAmount < coupon.restrictions.minimumAmount) {
      errors.push(`Order amount must be at least ${coupon.restrictions.minimumAmount}`);
    }
    
    if (coupon.restrictions?.maximumAmount && orderAmount > coupon.restrictions.maximumAmount) {
      errors.push(`Order amount must not exceed ${coupon.restrictions.maximumAmount}`);
    }

    const discountAmount = this.calculateDiscountAmount(coupon, orderAmount);

    return {
      isValid: errors.length === 0,
      coupon,
      errors,
      warnings,
      discountAmount,
      metadata: {
        platform: Platform.WOOCOMMERCE,
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
          platform: Platform.WOOCOMMERCE,
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
        platform: Platform.WOOCOMMERCE,
        couponCode: coupon.code,
        discountType: coupon.type,
        freeShipping: coupon.metadata?.freeShipping
      }
    };
  }

  // Platform-specific methods

  /**
   * Map WooCommerce discount type to unified type
   */
  mapWooCommerceType(type: 'percent' | 'fixed_cart' | 'fixed_product'): DiscountType {
    switch (type) {
      case 'percent':
        return DiscountType.PERCENTAGE;
      case 'fixed_cart':
        return DiscountType.FIXED_CART;
      case 'fixed_product':
        return DiscountType.FIXED_PRODUCT;
      default:
        return DiscountType.FIXED_CART;
    }
  }

  /**
   * Handle individual use restriction
   */
  validateIndividualUse(coupon: CouponData, appliedCoupons: string[]): boolean {
    if (!coupon.restrictions?.metadata?.individualUse) {
      return true;
    }
    
    // If this coupon requires individual use, no other coupons should be applied
    return appliedCoupons.length === 0 || (appliedCoupons.length === 1 && appliedCoupons[0] === coupon.code);
  }

  /**
   * Handle product/category restrictions
   */
  validateProductRestrictions(coupon: CouponData, productIds: number[], categoryIds: number[]): boolean {
    const allowedProducts = (coupon.restrictions?.allowedProducts || []).map(id => parseInt(id));
    const excludedProducts = (coupon.restrictions?.excludedProducts || []).map(id => parseInt(id));
    const allowedCategories = (coupon.restrictions?.allowedCategories || []).map(id => parseInt(id));
    const excludedCategories = (coupon.restrictions?.excludedCategories || []).map(id => parseInt(id));

    // Check excluded products
    if (excludedProducts.length > 0 && productIds.some(id => excludedProducts.includes(id))) {
      return false;
    }

    // Check excluded categories
    if (excludedCategories.length > 0 && categoryIds.some(id => excludedCategories.includes(id))) {
      return false;
    }

    // Check allowed products (if specified)
    if (allowedProducts.length > 0 && !productIds.some(id => allowedProducts.includes(id))) {
      return false;
    }

    // Check allowed categories (if specified)
    if (allowedCategories.length > 0 && !categoryIds.some(id => allowedCategories.includes(id))) {
      return false;
    }

    return true;
  }

  /**
   * Handle email restrictions
   */
  validateEmailRestrictions(coupon: CouponData, customerEmail: string): boolean {
    const emailRestrictions = coupon.restrictions?.allowedUsers || [];
    
    if (emailRestrictions.length === 0) {
      return true;
    }
    
    return emailRestrictions.includes(customerEmail);
  }

  /**
   * Handle sale item exclusions
   */
  validateSaleItemExclusion(coupon: CouponData, products: any[]): boolean {
    if (!coupon.restrictions?.metadata?.excludeSaleItems) {
      return true;
    }
    
    // Check if any products are on sale
    return !products.some(product => product.on_sale === true);
  }

  /**
   * Calculate usage limit restrictions
   */
  validateUsageLimits(coupon: CouponData, userId?: string): boolean {
    // Check global usage limit
    if (coupon.restrictions?.usageLimit && 
        coupon.usedCount && 
        coupon.usedCount >= coupon.restrictions.usageLimit) {
      return false;
    }

    // Check per-user usage limit
    if (coupon.restrictions?.usageLimitPerUser && userId) {
      const usedBy = coupon.restrictions.metadata?.usedBy || [];
      const userUsageCount = usedBy.filter((id: string) => id === userId).length;
      
      if (userUsageCount >= coupon.restrictions.usageLimitPerUser) {
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  private mapDiscountScope(discountType: string, freeShipping: boolean): DiscountScope {
    if (freeShipping) {
      return DiscountScope.SHIPPING;
    }
    
    switch (discountType) {
      case 'fixed_product':
        return DiscountScope.PRODUCT;
      case 'fixed_cart':
      case 'percent':
      default:
        return DiscountScope.CART;
    }
  }

  private determineStatus(data: WooCommerceCouponData): CouponStatus {
    const now = new Date();
    
    if (data.date_expires && new Date(data.date_expires) < now) {
      return CouponStatus.EXPIRED;
    }
    
    if (data.usage_limit && data.usage_count >= data.usage_limit) {
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
