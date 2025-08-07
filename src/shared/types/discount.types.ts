/**
 * Discount and coupon-related type definitions for the ACL service
 * Supports Hotmart, Nuvemshop, and WooCommerce platforms
 */

import { Platform } from './platform.types';

/**
 * Discount type enumeration
 */
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_CART = 'fixed_cart',
  FIXED_PRODUCT = 'fixed_product',
  FREE_SHIPPING = 'free_shipping',
  BUY_X_GET_Y = 'buy_x_get_y',
}

/**
 * Coupon status enumeration
 */
export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  USED = 'used',
  PENDING = 'pending',
  DRAFT = 'draft',
}

/**
 * Campaign status enumeration
 */
export enum CampaignStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
  DRAFT = 'draft',
}

/**
 * Discount application scope
 */
export enum DiscountScope {
  CART = 'cart',
  PRODUCT = 'product',
  CATEGORY = 'category',
  SHIPPING = 'shipping',
  GLOBAL = 'global',
}

/**
 * Usage restriction data
 */
export interface UsageRestrictionData {
  // Usage limits
  usageLimit?: number;
  usageLimitPerUser?: number;
  usedCount?: number;
  
  // User restrictions
  allowedUsers?: string[];
  excludedUsers?: string[];
  allowedRoles?: string[];
  
  // Product/Category restrictions
  allowedProducts?: string[];
  excludedProducts?: string[];
  allowedCategories?: string[];
  excludedCategories?: string[];
  
  // Order value restrictions
  minimumAmount?: number;
  maximumAmount?: number;
  
  // Platform-specific restrictions
  metadata?: Record<string, any>;
}

/**
 * Discount rule configuration
 */
export interface DiscountRuleData {
  // Rule identification
  id?: string;
  name: string;
  description?: string;
  
  // Discount configuration
  type: DiscountType;
  amount: number;
  scope: DiscountScope;
  
  // Conditions
  conditions?: {
    minimumQuantity?: number;
    maximumQuantity?: number;
    buyQuantity?: number;
    getQuantity?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
  };
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Unified coupon data structure
 */
export interface CouponData {
  // Core identification
  platform: Platform;
  externalId?: string;
  storeId?: string;
  
  // Coupon identification
  code: string;
  name?: string;
  description?: string;
  
  // Discount configuration
  type: DiscountType;
  amount: number;
  scope?: DiscountScope;
  
  // Usage restrictions
  restrictions?: UsageRestrictionData;
  
  // Validity period
  startsAt?: Date;
  expiresAt?: Date;
  
  // Status and tracking
  status: CouponStatus;
  usedCount?: number;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Promotional campaign data structure
 */
export interface CampaignData {
  // Core identification
  platform: Platform;
  externalId?: string;
  storeId?: string;
  
  // Campaign identification
  name: string;
  description?: string;
  
  // Campaign configuration
  discountRules: DiscountRuleData[];
  coupons?: CouponData[];
  
  // Targeting and restrictions
  restrictions?: UsageRestrictionData;
  
  // Campaign period
  startsAt?: Date;
  expiresAt?: Date;
  
  // Status and analytics
  status: CampaignStatus;
  totalUsage?: number;
  totalSavings?: number;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Discount application result
 */
export interface DiscountApplicationResult {
  // Application status
  success: boolean;
  applied: boolean;
  
  // Discount details
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  currency: string;
  
  // Applied discounts
  appliedCoupons?: string[];
  appliedRules?: string[];
  
  // Error information
  errors?: string[];
  warnings?: string[];
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

// Platform-specific coupon data structures

/**
 * Hotmart coupon data
 */
export interface HotmartCouponData {
  id?: number;
  code: string;
  discount: number; // Decimal between 0 and 0.99
  active: boolean;
  start_date?: number; // Unix timestamp in milliseconds
  end_date?: number; // Unix timestamp in milliseconds
  affiliate?: string; // Affiliate ID restriction
  offer_ids?: string[]; // Offer code restrictions
  status?: 'valid' | 'expired' | 'inactive' | 'used';
  time_zone?: {
    offset: string;
    description: string;
    id: string;
    name: string;
  };
}

/**
 * Nuvemshop discount data
 */
export interface NuvemshopDiscountData {
  id: number;
  type: 'percentage' | 'absolute';
  value: string;
  start_date?: string;
  end_date?: string;
  min_price?: string;
  usage_limit?: number;
  used?: number;
  coupon_code?: string;
  applies_to?: 'all' | 'products' | 'categories';
  applies_to_resource?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * WooCommerce coupon data
 */
export interface WooCommerceCouponData {
  id: number;
  code: string;
  amount: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  description: string;
  date_expires?: string;
  date_expires_gmt?: string;
  usage_count: number;
  individual_use: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  usage_limit?: number;
  usage_limit_per_user?: number;
  limit_usage_to_x_items?: number;
  free_shipping: boolean;
  product_categories: number[];
  excluded_product_categories: number[];
  exclude_sale_items: boolean;
  minimum_amount: string;
  maximum_amount: string;
  email_restrictions: string[];
  used_by: string[];
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  isValid: boolean;
  coupon?: CouponData;
  errors?: string[];
  warnings?: string[];
  discountAmount?: number;
  metadata?: Record<string, any>;
}

/**
 * Campaign analytics data
 */
export interface CampaignAnalyticsData {
  campaignId: string;
  totalUsage: number;
  totalSavings: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  topCoupons: Array<{
    code: string;
    usage: number;
    savings: number;
  }>;
  usageByDate: Array<{
    date: string;
    usage: number;
    savings: number;
  }>;
  metadata?: Record<string, any>;
}
