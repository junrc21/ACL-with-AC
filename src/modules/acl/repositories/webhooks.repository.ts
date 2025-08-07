import { PrismaClient, Webhook, SyncLog, Platform } from '@prisma/client';
import { prisma } from '@/database';
import { 
  BaseWebhookData, 
  WebhookStatus, 
  SyncLogData, 
  SyncOperation, 
  SyncStatus,
  WebhookEventType 
} from '@/shared/types/webhook.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Webhook repository for database operations
 */
export class WebhooksRepository {
  private logger = createPlatformLogger('DATABASE', 'WebhooksRepository');

  constructor(private db: PrismaClient = prisma) {}

  /**
   * Create a new webhook record
   */
  async create(webhookData: BaseWebhookData): Promise<Webhook> {
    this.logger.info({
      platform: webhookData.platform,
      eventType: webhookData.eventType,
      eventId: webhookData.eventId,
    }, 'Creating webhook record');

    try {
      const webhook = await this.db.webhook.create({
        data: {
          platform: webhookData.platform as Platform,
          eventType: webhookData.eventType,
          eventId: webhookData.eventId || null,
          payload: webhookData.payload as any,
          processed: false,
          processedAt: null,
          errorMessage: null,
          retryCount: 0,
          sourceIp: webhookData.sourceIp || null,
          userAgent: webhookData.userAgent || null,
          createdAt: webhookData.timestamp || new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.info({
        webhookId: webhook.id,
        platform: webhook.platform,
        eventType: webhook.eventType,
      }, 'Webhook record created successfully');

      return webhook;
    } catch (error) {
      this.logger.error({
        error,
        platform: webhookData.platform,
        eventType: webhookData.eventType,
      }, 'Failed to create webhook record');
      throw error;
    }
  }

  /**
   * Update webhook processing status
   */
  async updateProcessingStatus(
    id: string, 
    processed: boolean, 
    errorMessage?: string,
    retryCount?: number
  ): Promise<Webhook> {
    this.logger.info({ webhookId: id, processed }, 'Updating webhook processing status');

    try {
      const webhook = await this.db.webhook.update({
        where: { id },
        data: {
          processed,
          processedAt: processed ? new Date() : null,
          errorMessage: errorMessage || null,
          retryCount: retryCount || 0,
          updatedAt: new Date(),
        },
      });

      this.logger.info({
        webhookId: webhook.id,
        processed: webhook.processed,
        retryCount: webhook.retryCount,
      }, 'Webhook processing status updated');

      return webhook;
    } catch (error) {
      this.logger.error({
        error,
        webhookId: id,
      }, 'Failed to update webhook processing status');
      throw error;
    }
  }

  /**
   * Find webhook by ID
   */
  async findById(id: string): Promise<Webhook | null> {
    try {
      const webhook = await this.db.webhook.findUnique({
        where: { id },
      });

      this.logger.debug({
        webhookId: id,
        found: !!webhook,
      }, 'Webhook lookup by ID');

      return webhook;
    } catch (error) {
      this.logger.error({
        error,
        webhookId: id,
      }, 'Failed to find webhook by ID');
      throw error;
    }
  }

  /**
   * Find webhooks with filters and pagination
   */
  async findMany(filters: {
    platform?: Platform;
    eventType?: WebhookEventType;
    processed?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ webhooks: Webhook[]; total: number }> {
    try {
      const where: any = {};

      if (filters.platform) where.platform = filters.platform;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.processed !== undefined) where.processed = filters.processed;
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const orderBy: any = {};
      if (filters.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [webhooks, total] = await Promise.all([
        this.db.webhook.findMany({
          where,
          orderBy,
          take: filters.limit || 20,
          skip: filters.offset || 0,
        }),
        this.db.webhook.count({ where }),
      ]);

      this.logger.debug({
        filters,
        count: webhooks.length,
        total,
      }, 'Webhooks query executed');

      return { webhooks, total };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to find webhooks');
      throw error;
    }
  }

  /**
   * Find unprocessed webhooks for retry
   */
  async findUnprocessed(limit: number = 50): Promise<Webhook[]> {
    try {
      const webhooks = await this.db.webhook.findMany({
        where: {
          processed: false,
          retryCount: { lt: 5 }, // Max 5 retries
        },
        orderBy: {
          createdAt: 'asc', // Process oldest first
        },
        take: limit,
      });

      this.logger.debug({
        count: webhooks.length,
        limit,
      }, 'Found unprocessed webhooks');

      return webhooks;
    } catch (error) {
      this.logger.error({
        error,
        limit,
      }, 'Failed to find unprocessed webhooks');
      throw error;
    }
  }

  /**
   * Delete webhook by ID
   */
  async delete(id: string): Promise<void> {
    this.logger.info({ webhookId: id }, 'Deleting webhook');

    try {
      await this.db.webhook.delete({
        where: { id },
      });

      this.logger.info({ webhookId: id }, 'Webhook deleted successfully');
    } catch (error) {
      this.logger.error({
        error,
        webhookId: id,
      }, 'Failed to delete webhook');
      throw error;
    }
  }

  /**
   * Create sync log entry
   */
  async createSyncLog(syncLogData: SyncLogData): Promise<SyncLog> {
    this.logger.info({
      platform: syncLogData.platform,
      entityType: syncLogData.entityType,
      operation: syncLogData.operation,
    }, 'Creating sync log entry');

    try {
      const syncLog = await this.db.syncLog.create({
        data: {
          platform: syncLogData.platform as Platform,
          entityType: syncLogData.entityType,
          entityId: syncLogData.entityId || null,
          operation: syncLogData.operation,
          status: syncLogData.status,
          errorMessage: syncLogData.errorMessage || null,
          recordsAffected: syncLogData.recordsAffected,
          startedAt: syncLogData.startedAt,
          completedAt: syncLogData.completedAt || null,
          duration: syncLogData.duration || null,
          metadata: syncLogData.metadata as any,
        },
      });

      this.logger.info({
        syncLogId: syncLog.id,
        platform: syncLog.platform,
        entityType: syncLog.entityType,
      }, 'Sync log entry created successfully');

      return syncLog;
    } catch (error) {
      this.logger.error({
        error,
        platform: syncLogData.platform,
        entityType: syncLogData.entityType,
      }, 'Failed to create sync log entry');
      throw error;
    }
  }

  /**
   * Update sync log completion
   */
  async updateSyncLog(
    id: string,
    status: SyncStatus,
    errorMessage?: string,
    recordsAffected?: number,
    duration?: number
  ): Promise<SyncLog> {
    try {
      const syncLog = await this.db.syncLog.update({
        where: { id },
        data: {
          status,
          errorMessage: errorMessage || null,
          recordsAffected: recordsAffected || 0,
          completedAt: new Date(),
          duration: duration || null,
        },
      });

      this.logger.info({
        syncLogId: syncLog.id,
        status: syncLog.status,
        duration: syncLog.duration,
      }, 'Sync log updated');

      return syncLog;
    } catch (error) {
      this.logger.error({
        error,
        syncLogId: id,
      }, 'Failed to update sync log');
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  async getStatistics(filters: {
    platform?: Platform;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    total: number;
    processed: number;
    failed: number;
    byPlatform: Record<string, number>;
    byEventType: Record<string, number>;
  }> {
    try {
      const where: any = {};
      if (filters.platform) where.platform = filters.platform;
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const [total, processed, failed, byPlatform, byEventType] = await Promise.all([
        this.db.webhook.count({ where }),
        this.db.webhook.count({ where: { ...where, processed: true } }),
        this.db.webhook.count({ where: { ...where, processed: false, retryCount: { gte: 5 } } }),
        this.db.webhook.groupBy({
          by: ['platform'],
          where,
          _count: { platform: true },
        }),
        this.db.webhook.groupBy({
          by: ['eventType'],
          where,
          _count: { eventType: true },
        }),
      ]);

      const platformStats = byPlatform.reduce((acc, item) => {
        acc[item.platform] = item._count.platform;
        return acc;
      }, {} as Record<string, number>);

      const eventTypeStats = byEventType.reduce((acc, item) => {
        acc[item.eventType] = item._count.eventType;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        processed,
        failed,
        byPlatform: platformStats,
        byEventType: eventTypeStats,
      };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to get webhook statistics');
      throw error;
    }
  }
}
