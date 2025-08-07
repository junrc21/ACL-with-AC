import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/shared/services/prisma.service';
import { 
  CreateCampaignDto, 
  UpdateCampaignDto,
  CreateDiscountRuleDto,
  ListCampaignsQueryDto
} from '../dto/discount.dto';
import { 
  CampaignData,
  CampaignStatus,
  DiscountRuleData
} from '@/shared/types/discount.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

@Injectable()
export class CampaignsService {
  private logger = createPlatformLogger('SERVICE', 'Campaigns');

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new campaign
   */
  async createCampaign(storeId: string, createCampaignDto: CreateCampaignDto): Promise<CampaignData> {
    this.logger.info({ storeId, createCampaignDto }, 'Creating campaign');

    // Check if campaign name already exists for this store and platform
    const existingCampaign = await this.prisma.campaign.findFirst({
      where: {
        storeId,
        platform: createCampaignDto.platform,
        name: createCampaignDto.name,
      },
    });

    if (existingCampaign) {
      throw new ConflictException(`Campaign with name '${createCampaignDto.name}' already exists`);
    }

    // Create campaign in database
    const campaign = await this.prisma.campaign.create({
      data: {
        storeId,
        platform: createCampaignDto.platform,
        name: createCampaignDto.name,
        description: createCampaignDto.description,
        status: createCampaignDto.status || CampaignStatus.DRAFT,
        startsAt: createCampaignDto.startsAt ? new Date(createCampaignDto.startsAt) : null,
        expiresAt: createCampaignDto.expiresAt ? new Date(createCampaignDto.expiresAt) : null,
        totalUsage: 0,
        totalSavings: 0,
        metadata: createCampaignDto.metadata || {},
      },
      include: {
        discountRules: true,
      },
    });

    return this.mapPrismaCampaignToCampaignData(campaign);
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(storeId: string, campaignId: string): Promise<CampaignData> {
    this.logger.debug({ storeId, campaignId }, 'Getting campaign by ID');

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        storeId,
      },
      include: {
        discountRules: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID '${campaignId}' not found`);
    }

    return this.mapPrismaCampaignToCampaignData(campaign);
  }

  /**
   * List campaigns with filtering and pagination
   */
  async listCampaigns(storeId: string, query: ListCampaignsQueryDto) {
    this.logger.debug({ storeId, query }, 'Listing campaigns');

    const where: any = { storeId };

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          discountRules: true,
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns.map(campaign => this.mapPrismaCampaignToCampaignData(campaign)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(storeId: string, campaignId: string, updateCampaignDto: UpdateCampaignDto): Promise<CampaignData> {
    this.logger.info({ storeId, campaignId, updateCampaignDto }, 'Updating campaign');

    const existingCampaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        storeId,
      },
    });

    if (!existingCampaign) {
      throw new NotFoundException(`Campaign with ID '${campaignId}' not found`);
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name: updateCampaignDto.name,
        description: updateCampaignDto.description,
        status: updateCampaignDto.status,
        startsAt: updateCampaignDto.startsAt ? new Date(updateCampaignDto.startsAt) : undefined,
        expiresAt: updateCampaignDto.expiresAt ? new Date(updateCampaignDto.expiresAt) : undefined,
        metadata: updateCampaignDto.metadata ? { ...existingCampaign.metadata, ...updateCampaignDto.metadata } : undefined,
        updatedAt: new Date(),
      },
      include: {
        discountRules: true,
      },
    });

    return this.mapPrismaCampaignToCampaignData(updatedCampaign);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(storeId: string, campaignId: string): Promise<void> {
    this.logger.info({ storeId, campaignId }, 'Deleting campaign');

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        storeId,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID '${campaignId}' not found`);
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });
  }

  /**
   * Add discount rule to campaign
   */
  async addDiscountRule(storeId: string, campaignId: string, createDiscountRuleDto: CreateDiscountRuleDto): Promise<DiscountRuleData> {
    this.logger.info({ storeId, campaignId, createDiscountRuleDto }, 'Adding discount rule to campaign');

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        storeId,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID '${campaignId}' not found`);
    }

    const discountRule = await this.prisma.discountRule.create({
      data: {
        campaignId,
        storeId,
        platform: campaign.platform,
        name: createDiscountRuleDto.name,
        description: createDiscountRuleDto.description,
        type: createDiscountRuleDto.type,
        amount: createDiscountRuleDto.amount,
        scope: createDiscountRuleDto.scope,
        conditions: createDiscountRuleDto.conditions || {},
        restrictions: createDiscountRuleDto.restrictions || {},
        isActive: createDiscountRuleDto.isActive !== false,
        metadata: createDiscountRuleDto.metadata || {},
      },
    });

    return this.mapPrismaDiscountRuleToDiscountRuleData(discountRule);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(storeId: string, campaignId: string) {
    this.logger.debug({ storeId, campaignId }, 'Getting campaign analytics');

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        storeId,
      },
      include: {
        discountRules: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID '${campaignId}' not found`);
    }

    // Calculate analytics
    const analytics = {
      campaignId,
      name: campaign.name,
      status: campaign.status,
      totalUsage: campaign.totalUsage,
      totalSavings: parseFloat(campaign.totalSavings.toString()),
      totalRules: campaign.discountRules.length,
      activeRules: campaign.discountRules.filter(rule => rule.isActive).length,
      period: {
        startsAt: campaign.startsAt,
        expiresAt: campaign.expiresAt,
        isActive: this.isCampaignActive(campaign),
      },
      performance: {
        averageSavingsPerUse: campaign.totalUsage > 0 ? parseFloat(campaign.totalSavings.toString()) / campaign.totalUsage : 0,
        conversionRate: 0, // Would need order data to calculate
        topRules: campaign.discountRules
          .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()))
          .slice(0, 5)
          .map(rule => ({
            id: rule.id,
            name: rule.name,
            type: rule.type,
            amount: parseFloat(rule.amount.toString()),
            isActive: rule.isActive,
          })),
      },
      metadata: campaign.metadata,
    };

    return analytics;
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStatistics(storeId: string, platform?: Platform) {
    this.logger.debug({ storeId, platform }, 'Getting campaign statistics');

    const where: any = { storeId };
    if (platform) {
      where.platform = platform;
    }

    const [
      totalCampaigns,
      activeCampaigns,
      draftCampaigns,
      expiredCampaigns,
      totalUsage,
      totalSavings,
    ] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.count({ where: { ...where, status: CampaignStatus.ACTIVE } }),
      this.prisma.campaign.count({ where: { ...where, status: CampaignStatus.DRAFT } }),
      this.prisma.campaign.count({ where: { ...where, status: CampaignStatus.EXPIRED } }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { totalUsage: true },
      }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { totalSavings: true },
      }),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      draftCampaigns,
      expiredCampaigns,
      totalUsage: totalUsage._sum.totalUsage || 0,
      totalSavings: totalSavings._sum.totalSavings ? parseFloat(totalSavings._sum.totalSavings.toString()) : 0,
      platform,
    };
  }

  /**
   * Update campaign usage statistics
   */
  async updateCampaignUsage(campaignId: string, usageIncrement: number, savingsAmount: number): Promise<void> {
    try {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalUsage: { increment: usageIncrement },
          totalSavings: { increment: savingsAmount },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn({ campaignId, usageIncrement, savingsAmount, error }, 'Failed to update campaign usage');
    }
  }

  // Private helper methods

  private mapPrismaCampaignToCampaignData(campaign: any): CampaignData {
    return {
      platform: campaign.platform,
      externalId: campaign.id,
      storeId: campaign.storeId,
      name: campaign.name,
      description: campaign.description,
      discountRules: campaign.discountRules?.map((rule: any) => this.mapPrismaDiscountRuleToDiscountRuleData(rule)) || [],
      startsAt: campaign.startsAt,
      expiresAt: campaign.expiresAt,
      status: campaign.status,
      totalUsage: campaign.totalUsage,
      totalSavings: parseFloat(campaign.totalSavings.toString()),
      metadata: campaign.metadata,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private mapPrismaDiscountRuleToDiscountRuleData(rule: any): DiscountRuleData {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      amount: parseFloat(rule.amount.toString()),
      scope: rule.scope,
      conditions: rule.conditions,
      metadata: rule.metadata,
    };
  }

  private isCampaignActive(campaign: any): boolean {
    const now = new Date();
    
    if (campaign.status !== CampaignStatus.ACTIVE) {
      return false;
    }
    
    if (campaign.startsAt && now < campaign.startsAt) {
      return false;
    }
    
    if (campaign.expiresAt && now > campaign.expiresAt) {
      return false;
    }
    
    return true;
  }
}
