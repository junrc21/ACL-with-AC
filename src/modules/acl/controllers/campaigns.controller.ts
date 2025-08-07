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
import { CampaignsService } from '../services/campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateDiscountRuleDto,
  ListCampaignsQueryDto,
} from '../dto/discount.dto';
import { Platform } from '@/shared/types/platform.types';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { createPlatformLogger } from '@/shared/utils/logger';

@ApiTags('Promotional Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('acl/campaigns')
export class CampaignsController {
  private logger = createPlatformLogger('CONTROLLER', 'Campaigns');

  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promotional campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid campaign data' })
  @ApiResponse({ status: 409, description: 'Campaign name already exists' })
  async createCampaign(
    @Query('storeId') storeId: string,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    this.logger.info({ storeId, createCampaignDto }, 'Creating campaign');
    return await this.campaignsService.createCampaign(storeId, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async listCampaigns(
    @Query('storeId') storeId: string,
    @Query() query: ListCampaignsQueryDto,
  ) {
    this.logger.debug({ storeId, query }, 'Listing campaigns');
    return await this.campaignsService.listCampaigns(storeId, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiQuery({ name: 'platform', enum: Platform, required: false, description: 'Platform filter' })
  @ApiResponse({ status: 200, description: 'Campaign statistics retrieved successfully' })
  async getCampaignStatistics(
    @Query('storeId') storeId: string,
    @Query('platform') platform?: Platform,
  ) {
    this.logger.debug({ storeId, platform }, 'Getting campaign statistics');
    return await this.campaignsService.getCampaignStatistics(storeId, platform);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignById(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.debug({ storeId, campaignId }, 'Getting campaign by ID');
    return await this.campaignsService.getCampaignById(storeId, campaignId);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignAnalytics(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.debug({ storeId, campaignId }, 'Getting campaign analytics');
    return await this.campaignsService.getCampaignAnalytics(storeId, campaignId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    this.logger.info({ storeId, campaignId, updateCampaignDto }, 'Updating campaign');
    return await this.campaignsService.updateCampaign(storeId, campaignId, updateCampaignDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 204, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.info({ storeId, campaignId }, 'Deleting campaign');
    await this.campaignsService.deleteCampaign(storeId, campaignId);
  }

  @Post(':id/rules')
  @ApiOperation({ summary: 'Add discount rule to campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 201, description: 'Discount rule added successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async addDiscountRule(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
    @Body() createDiscountRuleDto: CreateDiscountRuleDto,
  ) {
    this.logger.info({ storeId, campaignId, createDiscountRuleDto }, 'Adding discount rule to campaign');
    return await this.campaignsService.addDiscountRule(storeId, campaignId, createDiscountRuleDto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign activated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async activateCampaign(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.info({ storeId, campaignId }, 'Activating campaign');
    return await this.campaignsService.updateCampaign(storeId, campaignId, { status: 'active' as any });
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deactivateCampaign(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.info({ storeId, campaignId }, 'Deactivating campaign');
    return await this.campaignsService.updateCampaign(storeId, campaignId, { status: 'inactive' as any });
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async pauseCampaign(
    @Query('storeId') storeId: string,
    @Param('id') campaignId: string,
  ) {
    this.logger.info({ storeId, campaignId }, 'Pausing campaign');
    return await this.campaignsService.updateCampaign(storeId, campaignId, { status: 'paused' as any });
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for campaigns service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    this.logger.debug('Campaigns service health check');
    
    return {
      status: 'healthy',
      service: 'campaigns',
      timestamp: new Date().toISOString(),
      supportedPlatforms: Object.values(Platform),
      features: [
        'campaign_management',
        'discount_rules',
        'campaign_analytics',
        'usage_tracking',
        'promotional_campaigns',
      ],
    };
  }
}
