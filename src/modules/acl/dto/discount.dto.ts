import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsDateString, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@/shared/types/platform.types';
import { DiscountType, CouponStatus, DiscountScope, CampaignStatus } from '@/shared/types/discount.types';

/**
 * DTO for creating a new coupon
 */
export class CreateCouponDto {
  @ApiProperty({ description: 'Platform for the coupon', enum: Platform })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ description: 'Coupon code', example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Coupon name', example: 'Summer Sale 20% Off' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type', enum: DiscountType })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Discount amount', example: 20 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Discount scope', enum: DiscountScope })
  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope;

  @ApiPropertyOptional({ description: 'Coupon start date' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Coupon expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage limit per user' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum order amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumAmount?: number;

  @ApiPropertyOptional({ description: 'Allowed product IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedProducts?: string[];

  @ApiPropertyOptional({ description: 'Excluded product IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedProducts?: string[];

  @ApiPropertyOptional({ description: 'Allowed category IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategories?: string[];

  @ApiPropertyOptional({ description: 'Excluded category IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCategories?: string[];

  @ApiPropertyOptional({ description: 'Allowed user emails', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUsers?: string[];

  @ApiPropertyOptional({ description: 'Platform-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a coupon
 */
export class UpdateCouponDto {
  @ApiPropertyOptional({ description: 'Coupon name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Coupon status', enum: CouponStatus })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({ description: 'Coupon start date' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Coupon expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage limit per user' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ description: 'Platform-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for coupon validation request
 */
export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Order amount for validation' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Product IDs in cart', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs in cart', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Already applied coupon codes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedCoupons?: string[];

  @ApiPropertyOptional({ description: 'Additional validation context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for applying discount
 */
export class ApplyDiscountDto {
  @ApiProperty({ description: 'Coupon code to apply', example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Order data for discount calculation' })
  @IsObject()
  orderData: {
    amount: number;
    currency?: string;
    items?: Array<{
      productId: string;
      categoryId?: string;
      quantity: number;
      price: number;
    }>;
  };

  @ApiPropertyOptional({ description: 'Customer information' })
  @IsOptional()
  @IsObject()
  customerInfo?: {
    id?: string;
    email?: string;
  };

  @ApiPropertyOptional({ description: 'Additional context for discount application' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for creating a campaign
 */
export class CreateCampaignDto {
  @ApiProperty({ description: 'Platform for the campaign', enum: Platform })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ description: 'Campaign name', example: 'Summer Sale 2024' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Campaign start date' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Campaign end date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Platform-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a campaign
 */
export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Campaign start date' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Campaign end date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Platform-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for discount rule creation
 */
export class CreateDiscountRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Buy 2 Get 1 Free' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type', enum: DiscountType })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Discount amount', example: 20 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Discount scope', enum: DiscountScope })
  @IsEnum(DiscountScope)
  scope: DiscountScope;

  @ApiPropertyOptional({ description: 'Rule conditions' })
  @IsOptional()
  @IsObject()
  conditions?: {
    minimumQuantity?: number;
    maximumQuantity?: number;
    buyQuantity?: number;
    getQuantity?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
  };

  @ApiPropertyOptional({ description: 'Rule restrictions' })
  @IsOptional()
  @IsObject()
  restrictions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Platform-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Query parameters for listing coupons
 */
export class ListCouponsQueryDto {
  @ApiPropertyOptional({ description: 'Platform filter', enum: Platform })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({ description: 'Status filter', enum: CouponStatus })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({ description: 'Discount type filter', enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiPropertyOptional({ description: 'Search by coupon code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Query parameters for listing campaigns
 */
export class ListCampaignsQueryDto {
  @ApiPropertyOptional({ description: 'Platform filter', enum: Platform })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({ description: 'Status filter', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Search by campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
