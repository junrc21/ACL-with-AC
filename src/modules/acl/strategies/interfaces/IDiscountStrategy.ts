/**
 * Discount strategy interfaces for the ACL service
 * Defines contracts for platform-specific discount implementations
 */

import { 
  CouponData, 
  CampaignData, 
  DiscountApplicationResult,
  CouponValidationResult,
  HotmartCouponData,
  NuvemshopDiscountData,
  WooCommerceCouponData
} from '@/shared/types/discount.types';
import { Platform, StrategyContext, ValidationResult } from '@/shared/types/platform.types';

/**
 * Base interface for all discount strategies
 */
export interface IDiscountStrategy {
  /**
   * Platform this strategy handles
   */
  readonly platform: Platform;

  /**
   * Parse platform-specific coupon data into unified format
   */
  parseCoupon(data: any, context: StrategyContext): Promise<CouponData>;

  /**
   * Parse platform-specific campaign data into unified format
   */
  parseCampaign?(data: any, context: StrategyContext): Promise<CampaignData>;

  /**
   * Validate platform-specific coupon data
   */
  validateCouponData(data: any): ValidationResult;

  /**
   * Transform unified coupon data back to platform format (for updates)
   */
  transformToPlatformFormat?(couponData: CouponData): any;

  /**
   * Extract store information from coupon data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string };

  /**
   * Handle platform-specific business rules
   */
  applyBusinessRules(couponData: CouponData): CouponData;

  /**
   * Validate coupon for usage
   */
  validateCouponUsage(coupon: CouponData, context: StrategyContext): Promise<CouponValidationResult>;

  /**
   * Apply discount to order/cart
   */
  applyDiscount(coupon: CouponData, orderData: any, context: StrategyContext): Promise<DiscountApplicationResult>;
}

/**
 * Hotmart-specific discount strategy interface
 */
export interface IHotmartDiscountStrategy extends IDiscountStrategy {
  platform: Platform.HOTMART;
  
  /**
   * Parse Hotmart coupon data
   */
  parseCoupon(data: HotmartCouponData, context: StrategyContext): Promise<CouponData>;
  
  /**
   * Create Hotmart coupon via API
   */
  createCoupon(productId: string, couponData: CouponData, context: StrategyContext): Promise<HotmartCouponData>;
  
  /**
   * Get Hotmart coupons for product
   */
  getCouponsForProduct(productId: string, context: StrategyContext): Promise<HotmartCouponData[]>;
  
  /**
   * Map Hotmart discount percentage to unified amount
   */
  mapHotmartDiscount(discount: number): number;
  
  /**
   * Map Hotmart coupon status to unified status
   */
  mapHotmartStatus(status: string): string;
  
  /**
   * Handle affiliate restrictions
   */
  validateAffiliateRestriction(coupon: CouponData, affiliateId?: string): boolean;
  
  /**
   * Handle offer restrictions
   */
  validateOfferRestriction(coupon: CouponData, offerIds?: string[]): boolean;
}

/**
 * Nuvemshop-specific discount strategy interface
 */
export interface INuvemshopDiscountStrategy extends IDiscountStrategy {
  platform: Platform.NUVEMSHOP;
  
  /**
   * Parse Nuvemshop discount data
   */
  parseCoupon(data: NuvemshopDiscountData, context: StrategyContext): Promise<CouponData>;
  
  /**
   * Map Nuvemshop discount type to unified type
   */
  mapNuvemshopType(type: 'percentage' | 'absolute'): string;
  
  /**
   * Handle minimum price restrictions
   */
  validateMinimumPrice(coupon: CouponData, orderAmount: number): boolean;
  
  /**
   * Handle product/category restrictions
   */
  validateApplicability(coupon: CouponData, products: string[], categories: string[]): boolean;
  
  /**
   * Parse multi-language coupon names
   */
  parseLocalizedName(name: Record<string, string> | string): string;
}

/**
 * WooCommerce-specific discount strategy interface
 */
export interface IWooCommerceDiscountStrategy extends IDiscountStrategy {
  platform: Platform.WOOCOMMERCE;
  
  /**
   * Parse WooCommerce coupon data
   */
  parseCoupon(data: WooCommerceCouponData, context: StrategyContext): Promise<CouponData>;
  
  /**
   * Map WooCommerce discount type to unified type
   */
  mapWooCommerceType(type: 'percent' | 'fixed_cart' | 'fixed_product'): string;
  
  /**
   * Handle individual use restriction
   */
  validateIndividualUse(coupon: CouponData, appliedCoupons: string[]): boolean;
  
  /**
   * Handle product/category restrictions
   */
  validateProductRestrictions(coupon: CouponData, productIds: number[], categoryIds: number[]): boolean;
  
  /**
   * Handle email restrictions
   */
  validateEmailRestrictions(coupon: CouponData, customerEmail: string): boolean;
  
  /**
   * Handle sale item exclusions
   */
  validateSaleItemExclusion(coupon: CouponData, products: any[]): boolean;
  
  /**
   * Calculate usage limit restrictions
   */
  validateUsageLimits(coupon: CouponData, userId?: string): boolean;
}

/**
 * Discount strategy context for operations
 */
export interface DiscountStrategyContext extends StrategyContext {
  // Order/cart context
  orderAmount?: number;
  currency?: string;
  customerEmail?: string;
  customerId?: string;

  // Product context
  productIds?: string[];
  categoryIds?: string[];

  // Platform-specific context
  affiliateId?: string; // Hotmart
  offerIds?: string[]; // Hotmart
  appliedCoupons?: string[]; // All platforms

  // Additional metadata - override the base metadata to be more flexible
  metadata?: Record<string, any>;
}

/**
 * Coupon processing result
 */
export interface CouponProcessingResult {
  success: boolean;
  coupon?: CouponData;
  externalId?: string;
  platform: Platform;
  errors?: string[];
  warnings?: string[];
  processingTime?: number;
}

/**
 * Campaign processing result
 */
export interface CampaignProcessingResult {
  success: boolean;
  campaign?: CampaignData;
  externalId?: string;
  platform: Platform;
  couponsProcessed?: number;
  rulesProcessed?: number;
  errors?: string[];
  warnings?: string[];
  processingTime?: number;
}

/**
 * Bulk coupon processing result
 */
export interface BulkCouponProcessingResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: CouponProcessingResult[];
  processingTime: number;
}

/**
 * Discount analytics result
 */
export interface DiscountAnalyticsResult {
  platform: Platform;
  storeId: string;
  totalCoupons: number;
  activeCoupons: number;
  totalUsage: number;
  totalSavings: number;
  averageDiscount: number;
  topCoupons: Array<{
    code: string;
    usage: number;
    savings: number;
  }>;
  usageByPeriod: Array<{
    period: string;
    usage: number;
    savings: number;
  }>;
}

/**
 * Discount validation result
 */
export interface DiscountValidationResult extends ValidationResult {
  discountSpecificErrors?: {
    codeRequired?: boolean;
    amountInvalid?: boolean;
    dateInvalid?: boolean;
    usageLimitExceeded?: boolean;
    expired?: boolean;
    inactive?: boolean;
    restrictionViolated?: boolean;
  };
}
