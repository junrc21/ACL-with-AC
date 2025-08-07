import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DiscountsService } from '../services/discounts.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  ApplyDiscountDto,
  ListCouponsQueryDto,
} from '../dto/discount.dto';
import { Platform } from '@/shared/types/platform.types';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { createPlatformLogger } from '@/shared/utils/logger';

@ApiTags('Discounts & Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('acl/discounts')
export class DiscountsController {
  private logger = createPlatformLogger('CONTROLLER', 'Discounts');

  constructor(private readonly discountsService: DiscountsService) {}

  @Post('coupons')
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid coupon data' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async createCoupon(
    @Query('storeId') storeId: string,
    @Body() createCouponDto: CreateCouponDto,
  ) {
    this.logger.info({ storeId, createCouponDto }, 'Creating coupon');
    return await this.discountsService.createCoupon(storeId, createCouponDto);
  }

  @Get('coupons')
  @ApiOperation({ summary: 'List coupons with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  async listCoupons(
    @Query('storeId') storeId: string,
    @Query() query: ListCouponsQueryDto,
  ) {
    this.logger.debug({ storeId, query }, 'Listing coupons');
    return await this.discountsService.listCoupons(storeId, query);
  }

  @Get('coupons/:id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async getCouponById(
    @Query('storeId') storeId: string,
    @Param('id') couponId: string,
  ) {
    this.logger.debug({ storeId, couponId }, 'Getting coupon by ID');
    return await this.discountsService.getCouponById(storeId, couponId);
  }

  @Get('coupons/code/:code')
  @ApiOperation({ summary: 'Get coupon by code' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiQuery({ name: 'platform', enum: Platform, description: 'Platform' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async getCouponByCode(
    @Query('storeId') storeId: string,
    @Query('platform', new ParseEnumPipe(Platform)) platform: Platform,
    @Param('code') code: string,
  ) {
    this.logger.debug({ storeId, platform, code }, 'Getting coupon by code');
    return await this.discountsService.getCouponByCode(storeId, platform, code);
  }

  @Put('coupons/:id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async updateCoupon(
    @Query('storeId') storeId: string,
    @Param('id') couponId: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    this.logger.info({ storeId, couponId, updateCouponDto }, 'Updating coupon');
    return await this.discountsService.updateCoupon(storeId, couponId, updateCouponDto);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 204, description: 'Coupon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async deleteCoupon(
    @Query('storeId') storeId: string,
    @Param('id') couponId: string,
  ) {
    this.logger.info({ storeId, couponId }, 'Deleting coupon');
    await this.discountsService.deleteCoupon(storeId, couponId);
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate coupon for usage' })
  @ApiQuery({ name: 'platform', enum: Platform, description: 'Platform' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  async validateCoupon(
    @Query('storeId') storeId: string,
    @Query('platform', new ParseEnumPipe(Platform)) platform: Platform,
    @Body() validateCouponDto: ValidateCouponDto,
  ) {
    this.logger.debug({ storeId, platform, validateCouponDto }, 'Validating coupon');
    return await this.discountsService.validateCoupon(storeId, platform, validateCouponDto);
  }

  @Post('coupons/apply')
  @ApiOperation({ summary: 'Apply discount to order' })
  @ApiQuery({ name: 'platform', enum: Platform, description: 'Platform' })
  @ApiResponse({ status: 200, description: 'Discount application result' })
  async applyDiscount(
    @Query('storeId') storeId: string,
    @Query('platform', new ParseEnumPipe(Platform)) platform: Platform,
    @Body() applyDiscountDto: ApplyDiscountDto,
  ) {
    this.logger.info({ storeId, platform, applyDiscountDto }, 'Applying discount');
    return await this.discountsService.applyDiscount(storeId, platform, applyDiscountDto);
  }

  @Get('coupons/statistics')
  @ApiOperation({ summary: 'Get coupon statistics' })
  @ApiQuery({ name: 'platform', enum: Platform, required: false, description: 'Platform filter' })
  @ApiResponse({ status: 200, description: 'Coupon statistics retrieved successfully' })
  async getCouponStatistics(
    @Query('storeId') storeId: string,
    @Query('platform') platform?: Platform,
  ) {
    this.logger.debug({ storeId, platform }, 'Getting coupon statistics');
    return await this.discountsService.getCouponStatistics(storeId, platform);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync coupons from platform' })
  @ApiQuery({ name: 'platform', enum: Platform, description: 'Platform to sync from' })
  @ApiResponse({ status: 200, description: 'Coupons synced successfully' })
  async syncCoupons(
    @Query('storeId') storeId: string,
    @Query('platform', new ParseEnumPipe(Platform)) platform: Platform,
  ) {
    this.logger.info({ storeId, platform }, 'Syncing coupons from platform');
    
    // This would implement platform-specific coupon synchronization
    // For now, return a placeholder response
    return {
      success: true,
      platform,
      message: 'Coupon sync functionality will be implemented in future versions',
      syncedCount: 0,
      errors: [],
    };
  }

  @Get('platforms/:platform/capabilities')
  @ApiOperation({ summary: 'Get platform discount capabilities' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Platform' })
  @ApiResponse({ status: 200, description: 'Platform capabilities retrieved successfully' })
  async getPlatformCapabilities(
    @Param('platform', new ParseEnumPipe(Platform)) platform: Platform,
  ) {
    this.logger.debug({ platform }, 'Getting platform discount capabilities');
    
    // Return platform-specific discount capabilities
    const capabilities = {
      [Platform.HOTMART]: {
        supportedTypes: ['percentage'],
        supportedScopes: ['cart'],
        features: {
          affiliateRestrictions: true,
          offerRestrictions: true,
          dateRestrictions: true,
          usageLimits: false,
          emailRestrictions: false,
          productRestrictions: false,
          categoryRestrictions: false,
        },
        maxDiscountPercentage: 99,
        codeLength: { min: 1, max: 25 },
      },
      [Platform.NUVEMSHOP]: {
        supportedTypes: ['percentage', 'fixed_cart'],
        supportedScopes: ['cart', 'product', 'category'],
        features: {
          affiliateRestrictions: false,
          offerRestrictions: false,
          dateRestrictions: true,
          usageLimits: true,
          emailRestrictions: false,
          productRestrictions: true,
          categoryRestrictions: true,
          minimumAmount: true,
        },
        maxDiscountPercentage: 100,
        codeLength: { min: 1, max: 50 },
      },
      [Platform.WOOCOMMERCE]: {
        supportedTypes: ['percentage', 'fixed_cart', 'fixed_product', 'free_shipping'],
        supportedScopes: ['cart', 'product', 'category', 'shipping'],
        features: {
          affiliateRestrictions: false,
          offerRestrictions: false,
          dateRestrictions: true,
          usageLimits: true,
          emailRestrictions: true,
          productRestrictions: true,
          categoryRestrictions: true,
          minimumAmount: true,
          maximumAmount: true,
          individualUse: true,
          excludeSaleItems: true,
        },
        maxDiscountPercentage: 100,
        codeLength: { min: 1, max: 100 },
      },
    };

    return {
      platform,
      capabilities: capabilities[platform] || {},
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for discount service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    this.logger.debug('Discount service health check');
    
    return {
      status: 'healthy',
      service: 'discounts',
      timestamp: new Date().toISOString(),
      supportedPlatforms: Object.values(Platform),
    };
  }
}
