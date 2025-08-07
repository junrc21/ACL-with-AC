import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/shared/services/prisma.service';
import { DiscountStrategyFactory } from '../strategies/factories/DiscountStrategyFactory';
import { 
  CreateCouponDto, 
  UpdateCouponDto, 
  ValidateCouponDto, 
  ApplyDiscountDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateDiscountRuleDto,
  ListCouponsQueryDto,
  ListCampaignsQueryDto
} from '../dto/discount.dto';
import { 
  CouponData, 
  CampaignData,
  CouponValidationResult,
  DiscountApplicationResult,
  CouponStatus,
  CampaignStatus
} from '@/shared/types/discount.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

@Injectable()
export class DiscountsService {
  private logger = createPlatformLogger('SERVICE', 'Discounts');

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new coupon
   */
  async createCoupon(storeId: string, createCouponDto: CreateCouponDto): Promise<CouponData> {
    this.logger.info({ storeId, createCouponDto }, 'Creating coupon');

    // Check if coupon code already exists for this store and platform
    const existingCoupon = await this.prisma.coupon.findFirst({
      where: {
        storeId,
        platform: createCouponDto.platform,
        code: createCouponDto.code,
      },
    });

    if (existingCoupon) {
      throw new ConflictException(`Coupon with code '${createCouponDto.code}' already exists`);
    }

    // Get strategy for validation
    const strategy = DiscountStrategyFactory.getStrategy(createCouponDto.platform);
    
    // Validate coupon data
    const validation = strategy.validateCouponData(createCouponDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid coupon data: ${validation.errors.join(', ')}`);
    }

    // Create coupon in database
    const coupon = await this.prisma.coupon.create({
      data: {
        storeId,
        platform: createCouponDto.platform,
        code: createCouponDto.code,
        name: createCouponDto.name,
        description: createCouponDto.description,
        type: createCouponDto.type,
        amount: createCouponDto.amount,
        scope: createCouponDto.scope,
        startsAt: createCouponDto.startsAt ? new Date(createCouponDto.startsAt) : null,
        expiresAt: createCouponDto.expiresAt ? new Date(createCouponDto.expiresAt) : null,
        status: CouponStatus.ACTIVE,
        usageLimit: createCouponDto.usageLimit,
        usageLimitPerUser: createCouponDto.usageLimitPerUser,
        usedCount: 0,
        minimumAmount: createCouponDto.minimumAmount,
        maximumAmount: createCouponDto.maximumAmount,
        allowedProducts: createCouponDto.allowedProducts,
        excludedProducts: createCouponDto.excludedProducts,
        allowedCategories: createCouponDto.allowedCategories,
        excludedCategories: createCouponDto.excludedCategories,
        allowedUsers: createCouponDto.allowedUsers,
        metadata: createCouponDto.metadata || {},
      },
    });

    return this.mapPrismaCouponToCouponData(coupon);
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(storeId: string, couponId: string): Promise<CouponData> {
    this.logger.debug({ storeId, couponId }, 'Getting coupon by ID');

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        storeId,
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID '${couponId}' not found`);
    }

    return this.mapPrismaCouponToCouponData(coupon);
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(storeId: string, platform: Platform, code: string): Promise<CouponData> {
    this.logger.debug({ storeId, platform, code }, 'Getting coupon by code');

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        storeId,
        platform,
        code,
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code '${code}' not found`);
    }

    return this.mapPrismaCouponToCouponData(coupon);
  }

  /**
   * List coupons with filtering and pagination
   */
  async listCoupons(storeId: string, query: ListCouponsQueryDto) {
    this.logger.debug({ storeId, query }, 'Listing coupons');

    const where: any = { storeId };

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.code) {
      where.code = {
        contains: query.code,
        mode: 'insensitive',
      };
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons.map(coupon => this.mapPrismaCouponToCouponData(coupon)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Update coupon
   */
  async updateCoupon(storeId: string, couponId: string, updateCouponDto: UpdateCouponDto): Promise<CouponData> {
    this.logger.info({ storeId, couponId, updateCouponDto }, 'Updating coupon');

    const existingCoupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        storeId,
      },
    });

    if (!existingCoupon) {
      throw new NotFoundException(`Coupon with ID '${couponId}' not found`);
    }

    const updatedCoupon = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        name: updateCouponDto.name,
        description: updateCouponDto.description,
        amount: updateCouponDto.amount,
        status: updateCouponDto.status,
        startsAt: updateCouponDto.startsAt ? new Date(updateCouponDto.startsAt) : undefined,
        expiresAt: updateCouponDto.expiresAt ? new Date(updateCouponDto.expiresAt) : undefined,
        usageLimit: updateCouponDto.usageLimit,
        usageLimitPerUser: updateCouponDto.usageLimitPerUser,
        metadata: updateCouponDto.metadata ? { ...existingCoupon.metadata, ...updateCouponDto.metadata } : undefined,
        updatedAt: new Date(),
      },
    });

    return this.mapPrismaCouponToCouponData(updatedCoupon);
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(storeId: string, couponId: string): Promise<void> {
    this.logger.info({ storeId, couponId }, 'Deleting coupon');

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        storeId,
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID '${couponId}' not found`);
    }

    await this.prisma.coupon.delete({
      where: { id: couponId },
    });
  }

  /**
   * Validate coupon for usage
   */
  async validateCoupon(storeId: string, platform: Platform, validateCouponDto: ValidateCouponDto): Promise<CouponValidationResult> {
    this.logger.debug({ storeId, platform, validateCouponDto }, 'Validating coupon');

    try {
      const coupon = await this.getCouponByCode(storeId, platform, validateCouponDto.code);
      const strategy = DiscountStrategyFactory.getStrategy(platform);

      const context = {
        storeId,
        platform,
        metadata: {
          orderAmount: validateCouponDto.orderAmount,
          customerEmail: validateCouponDto.customerEmail,
          customerId: validateCouponDto.customerId,
          productIds: validateCouponDto.productIds,
          categoryIds: validateCouponDto.categoryIds,
          appliedCoupons: validateCouponDto.appliedCoupons,
          ...validateCouponDto.metadata,
        },
      };

      return await strategy.validateCouponUsage(coupon, context);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          isValid: false,
          errors: [`Coupon '${validateCouponDto.code}' not found`],
        };
      }
      throw error;
    }
  }

  /**
   * Apply discount to order
   */
  async applyDiscount(storeId: string, platform: Platform, applyDiscountDto: ApplyDiscountDto): Promise<DiscountApplicationResult> {
    this.logger.debug({ storeId, platform, applyDiscountDto }, 'Applying discount');

    try {
      const coupon = await this.getCouponByCode(storeId, platform, applyDiscountDto.code);
      const strategy = DiscountStrategyFactory.getStrategy(platform);

      const context = {
        storeId,
        platform,
        metadata: {
          orderAmount: applyDiscountDto.orderData.amount,
          currency: applyDiscountDto.orderData.currency,
          customerEmail: applyDiscountDto.customerInfo?.email,
          customerId: applyDiscountDto.customerInfo?.id,
          productIds: applyDiscountDto.orderData.items?.map(item => item.productId),
          categoryIds: applyDiscountDto.orderData.items?.map(item => item.categoryId).filter(Boolean),
          ...applyDiscountDto.metadata,
        },
      };

      const result = await strategy.applyDiscount(coupon, applyDiscountDto.orderData, context);

      // Update usage count if discount was successfully applied
      if (result.success && result.applied) {
        await this.incrementCouponUsage(coupon.externalId || coupon.code, applyDiscountDto.customerInfo?.id);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          applied: false,
          discountAmount: 0,
          originalAmount: applyDiscountDto.orderData.amount,
          finalAmount: applyDiscountDto.orderData.amount,
          currency: applyDiscountDto.orderData.currency || 'USD',
          errors: [`Coupon '${applyDiscountDto.code}' not found`],
        };
      }
      throw error;
    }
  }

  /**
   * Get coupon statistics
   */
  async getCouponStatistics(storeId: string, platform?: Platform) {
    this.logger.debug({ storeId, platform }, 'Getting coupon statistics');

    const where: any = { storeId };
    if (platform) {
      where.platform = platform;
    }

    const [
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      usedCoupons,
      totalUsage,
      totalSavings,
    ] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.ACTIVE } }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.EXPIRED } }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.USED } }),
      this.prisma.coupon.aggregate({
        where,
        _sum: { usedCount: true },
      }),
      // Note: totalSavings would need to be calculated from order data
      // For now, we'll return 0 as a placeholder
      Promise.resolve(0),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      usedCoupons,
      totalUsage: totalUsage._sum.usedCount || 0,
      totalSavings,
      platform,
    };
  }

  // Private helper methods

  private mapPrismaCouponToCouponData(coupon: any): CouponData {
    return {
      platform: coupon.platform,
      externalId: coupon.id,
      storeId: coupon.storeId,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      amount: parseFloat(coupon.amount.toString()),
      scope: coupon.scope,
      restrictions: {
        usageLimit: coupon.usageLimit,
        usageLimitPerUser: coupon.usageLimitPerUser,
        usedCount: coupon.usedCount,
        minimumAmount: coupon.minimumAmount ? parseFloat(coupon.minimumAmount.toString()) : undefined,
        maximumAmount: coupon.maximumAmount ? parseFloat(coupon.maximumAmount.toString()) : undefined,
        allowedProducts: coupon.allowedProducts,
        excludedProducts: coupon.excludedProducts,
        allowedCategories: coupon.allowedCategories,
        excludedCategories: coupon.excludedCategories,
        allowedUsers: coupon.allowedUsers,
      },
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      status: coupon.status,
      usedCount: coupon.usedCount,
      metadata: coupon.metadata,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  private async incrementCouponUsage(couponIdentifier: string, userId?: string): Promise<void> {
    try {
      await this.prisma.coupon.update({
        where: { id: couponIdentifier },
        data: {
          usedCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn({ couponIdentifier, userId, error }, 'Failed to increment coupon usage');
    }
  }
}
