import { Request, Response } from 'express';
import { WebhooksService } from '../services/webhooks.service';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { asyncHandler, ApiError } from '@/middlewares/error.middleware';
import {
  CreateWebhookRequestSchema,
  ProcessWebhookRequestSchema,
  WebhookQuerySchema,
  WebhookRetryRequestSchema,
  WebhookStatisticsRequestSchema,
  HotmartWebhookPayloadSchema,
  NuvemshopWebhookPayloadSchema,
  WooCommerceWebhookPayloadSchema,
  WebhookRegistrationSchema,
  WebhookUpdateSchema,
  SyncLogQuerySchema
} from '../dto/webhook.dto';
import { Platform } from '@/shared/types/platform.types';
import { BaseWebhookData, WebhookEventType } from '@/shared/types/webhook.types';
import { webhookStrategyFactory } from '../strategies/factories/WebhookStrategyFactory';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Webhooks controller for handling HTTP requests
 */
export class WebhooksController {
  private logger = createPlatformLogger('CONTROLLER', 'WebhooksController');

  constructor(
    private webhooksService: WebhooksService = new WebhooksService()
  ) {}

  /**
   * Receive webhook from Hotmart
   * POST /api/acl/webhooks/hotmart
   */
  public receiveHotmartWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const hottok = req.headers['x-hotmart-hottok'] as string;
    
    this.logger.info({
      platform: Platform.HOTMART,
      hottok: hottok ? 'present' : 'missing',
      method: req.method,
      path: req.path,
    }, 'Processing Hotmart webhook');

    // Validate Hotmart webhook payload
    const validatedData = HotmartWebhookPayloadSchema.parse(req.body);

    // Create webhook data
    const webhookData: BaseWebhookData = {
      id: validatedData.id,
      platform: Platform.HOTMART,
      eventType: this.mapHotmartEvent(validatedData.event),
      eventId: validatedData.id,
      payload: validatedData,
      timestamp: new Date(),
      sourceIp: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // Create strategy context
    const context = {
      platform: Platform.HOTMART,
      headers: {
        'x-source-platform': Platform.HOTMART,
        'x-hotmart-hottok': hottok,
        'user-agent': req.get('User-Agent'),
      } as any,
      timestamp: new Date(),
    };

    // Process webhook
    const result = await this.webhooksService.processWebhook(webhookData, context);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          webhookId: webhookData.id,
          eventType: webhookData.eventType,
          status: result.status,
          processingTime: result.processingTime,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: result.error || 'Failed to process webhook',
          details: {
            eventType: webhookData.eventType,
            status: result.status,
          },
        },
      });
    }
  });

  /**
   * Receive webhook from Nuvemshop
   * POST /api/acl/webhooks/nuvemshop
   */
  public receiveNuvemshopWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const hmacSignature = req.headers['x-linkedstore-hmac-sha256'] as string;
    
    this.logger.info({
      platform: Platform.NUVEMSHOP,
      signature: hmacSignature ? 'present' : 'missing',
      method: req.method,
      path: req.path,
    }, 'Processing Nuvemshop webhook');

    // Validate Nuvemshop webhook payload
    const validatedData = NuvemshopWebhookPayloadSchema.parse(req.body);

    // Create webhook data
    const webhookData: BaseWebhookData = {
      id: validatedData.id.toString(),
      platform: Platform.NUVEMSHOP,
      eventType: this.mapNuvemshopEvent(validatedData.event),
      eventId: validatedData.id.toString(),
      payload: validatedData,
      timestamp: new Date(validatedData.created_at),
      sourceIp: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // Create strategy context
    const context = {
      platform: Platform.NUVEMSHOP,
      storeId: validatedData.store_id.toString(),
      headers: {
        'x-source-platform': Platform.NUVEMSHOP,
        'x-linkedstore-hmac-sha256': hmacSignature,
        'user-agent': req.get('User-Agent'),
      } as any,
      timestamp: new Date(),
    };

    // Process webhook
    const result = await this.webhooksService.processWebhook(webhookData, context);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          webhookId: webhookData.id,
          eventType: webhookData.eventType,
          status: result.status,
          processingTime: result.processingTime,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: result.error || 'Failed to process webhook',
          details: {
            eventType: webhookData.eventType,
            status: result.status,
          },
        },
      });
    }
  });

  /**
   * Receive webhook from WooCommerce
   * POST /api/acl/webhooks/woocommerce
   */
  public receiveWooCommerceWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-wc-webhook-signature'] as string;
    
    this.logger.info({
      platform: Platform.WOOCOMMERCE,
      signature: signature ? 'present' : 'missing',
      method: req.method,
      path: req.path,
    }, 'Processing WooCommerce webhook');

    // Validate WooCommerce webhook payload
    const validatedData = WooCommerceWebhookPayloadSchema.parse(req.body);

    // Create webhook data
    const webhookData: BaseWebhookData = {
      id: validatedData.id.toString(),
      platform: Platform.WOOCOMMERCE,
      eventType: this.mapWooCommerceEvent(validatedData.resource, validatedData.event),
      eventId: validatedData.id.toString(),
      payload: validatedData,
      timestamp: new Date(validatedData.date_modified || validatedData.date_created),
      sourceIp: req.ip,
      userAgent: req.get('User-Agent'),
    };

    // Create strategy context
    const context = {
      platform: Platform.WOOCOMMERCE,
      headers: {
        'x-source-platform': Platform.WOOCOMMERCE,
        'x-wc-webhook-signature': signature,
        'user-agent': req.get('User-Agent'),
      } as any,
      timestamp: new Date(),
    };

    // Process webhook
    const result = await this.webhooksService.processWebhook(webhookData, context);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          webhookId: webhookData.id,
          eventType: webhookData.eventType,
          status: result.status,
          processingTime: result.processingTime,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: result.error || 'Failed to process webhook',
          details: {
            eventType: webhookData.eventType,
            status: result.status,
          },
        },
      });
    }
  });

  /**
   * Get webhooks with filters
   * GET /api/acl/webhooks
   */
  public getWebhooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug({ query: req.query }, 'Getting webhooks');

    // Validate query parameters
    const filters = WebhookQuerySchema.parse(req.query);

    const result = await this.webhooksService.getWebhooks(filters);

    res.json({
      success: true,
      data: {
        webhooks: result.webhooks,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: result.total > (filters.offset + filters.limit),
        },
        filters,
      },
    });
  });

  /**
   * Get webhook by ID
   * GET /api/acl/webhooks/:id
   */
  public getWebhookById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.debug({ webhookId: id }, 'Getting webhook by ID');

    const webhook = await this.webhooksService.getWebhookById(id);

    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    res.json({
      success: true,
      data: webhook,
    });
  });

  /**
   * Retry webhook processing
   * POST /api/acl/webhooks/:id/retry
   */
  public retryWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({ webhookId: id }, 'Retrying webhook processing');

    const retryRequest = WebhookRetryRequestSchema.parse({
      webhookId: id,
      ...req.body,
    });

    // Get webhook and retry processing
    const webhook = await this.webhooksService.getWebhookById(id);
    
    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    // Create webhook data from stored webhook
    const webhookData: BaseWebhookData = {
      id: webhook.id,
      platform: webhook.platform as Platform,
      eventType: webhook.eventType as WebhookEventType,
      eventId: webhook.eventId || undefined,
      payload: webhook.payload as Record<string, any>,
      timestamp: webhook.createdAt,
      sourceIp: webhook.sourceIp || undefined,
      userAgent: webhook.userAgent || undefined,
    };

    const context = {
      platform: webhook.platform as Platform,
      headers: {} as any,
      timestamp: new Date(),
    };

    const result = await this.webhooksService.processWebhook(webhookData, context);

    res.json({
      success: true,
      data: {
        webhookId: id,
        retryResult: result,
      },
      message: result.success ? 'Webhook retried successfully' : 'Webhook retry failed',
    });
  });

  /**
   * Get webhook statistics
   * GET /api/acl/webhooks/statistics
   */
  public getStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug({ query: req.query }, 'Getting webhook statistics');

    const filters = WebhookStatisticsRequestSchema.parse(req.query);

    const statistics = await this.webhooksService.getWebhookStatistics(filters);

    res.json({
      success: true,
      data: {
        statistics,
        filters,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * Retry failed webhooks in batch
   * POST /api/acl/webhooks/retry-failed
   */
  public retryFailedWebhooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit = 50 } = req.body;

    this.logger.info({ limit }, 'Retrying failed webhooks in batch');

    const result = await this.webhooksService.retryFailedWebhooks(limit);

    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} webhooks: ${result.successful} successful, ${result.failed} failed`,
    });
  });

  /**
   * Map Hotmart event to unified event type
   */
  private mapHotmartEvent(eventName: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'PURCHASE_COMPLETED': WebhookEventType.PURCHASE_COMPLETED,
      'PURCHASE_REFUNDED': WebhookEventType.PURCHASE_REFUNDED,
      'SUBSCRIPTION_CANCELLATION': WebhookEventType.SUBSCRIPTION_CANCELLATION,
      'SUBSCRIPTION_CREATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'SUBSCRIPTION_RENEWED': WebhookEventType.SUBSCRIPTION_RENEWED,
      'COMMISSION_GENERATED': WebhookEventType.COMMISSION_GENERATED,
    };

    return eventMap[eventName] || WebhookEventType.PURCHASE_COMPLETED;
  }

  /**
   * Map Nuvemshop event to unified event type
   */
  private mapNuvemshopEvent(eventName: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'order/created': WebhookEventType.ORDER_CREATED,
      'order/updated': WebhookEventType.ORDER_UPDATED,
      'order/paid': WebhookEventType.ORDER_PAID,
      'order/cancelled': WebhookEventType.ORDER_CANCELLED,
      'order/fulfilled': WebhookEventType.ORDER_FULFILLED,
      'order/packed': WebhookEventType.ORDER_PACKED,
      'order/shipped': WebhookEventType.ORDER_SHIPPED,
      'order/delivered': WebhookEventType.ORDER_DELIVERED,
      'product/created': WebhookEventType.PRODUCT_CREATED,
      'product/updated': WebhookEventType.PRODUCT_UPDATED,
      'product/deleted': WebhookEventType.PRODUCT_DELETED,
      'customer/created': WebhookEventType.CUSTOMER_CREATED,
      'customer/updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer/deleted': WebhookEventType.CUSTOMER_DELETED,
      'category/created': WebhookEventType.CATEGORY_CREATED,
      'category/updated': WebhookEventType.CATEGORY_UPDATED,
      'category/deleted': WebhookEventType.CATEGORY_DELETED,
      'app/uninstalled': WebhookEventType.APP_UNINSTALLED,
      'app/suspended': WebhookEventType.APP_SUSPENDED,
      'app/resumed': WebhookEventType.APP_RESUMED,
    };

    return eventMap[eventName] || WebhookEventType.ORDER_CREATED;
  }

  /**
   * Map WooCommerce event to unified event type
   */
  private mapWooCommerceEvent(resource: string, event: string): WebhookEventType {
    const eventKey = `${resource}.${event}`;

    const eventMap: Record<string, WebhookEventType> = {
      'order.created': WebhookEventType.ORDER_CREATED,
      'order.updated': WebhookEventType.ORDER_UPDATED,
      'order.deleted': WebhookEventType.ORDER_CANCELLED,
      'product.created': WebhookEventType.PRODUCT_CREATED,
      'product.updated': WebhookEventType.PRODUCT_UPDATED,
      'product.deleted': WebhookEventType.PRODUCT_DELETED,
      'customer.created': WebhookEventType.CUSTOMER_CREATED,
      'customer.updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer.deleted': WebhookEventType.CUSTOMER_DELETED,
      'coupon.created': WebhookEventType.COUPON_CREATED,
      'coupon.updated': WebhookEventType.COUPON_UPDATED,
      'coupon.deleted': WebhookEventType.COUPON_DELETED,
      'order.refunded': WebhookEventType.ORDER_REFUNDED,
    };

    return eventMap[eventKey] || WebhookEventType.ORDER_CREATED;
  }

  /**
   * Register webhook configuration
   * POST /api/acl/webhooks/register
   */
  public registerWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.info({ body: req.body }, 'Registering webhook configuration');

    const validatedData = WebhookRegistrationSchema.parse(req.body);

    // In a real implementation, this would store webhook configuration
    // and potentially register with the platform's webhook system
    const webhookConfig = {
      id: crypto.randomUUID(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.status(201).json({
      success: true,
      data: webhookConfig,
      message: 'Webhook configuration registered successfully',
    });
  });

  /**
   * Update webhook configuration
   * PUT /api/acl/webhooks/config/:id
   */
  public updateWebhookConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({ webhookConfigId: id, body: req.body }, 'Updating webhook configuration');

    const validatedData = WebhookUpdateSchema.parse(req.body);

    // In a real implementation, this would update stored webhook configuration
    const updatedConfig = {
      id,
      ...validatedData,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Webhook configuration updated successfully',
    });
  });

  /**
   * Get webhook configurations
   * GET /api/acl/webhooks/config
   */
  public getWebhookConfigs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug({ query: req.query }, 'Getting webhook configurations');

    // In a real implementation, this would fetch from database
    const configs = [
      {
        id: '1',
        platform: Platform.HOTMART,
        endpoint: 'https://api.example.com/webhooks/hotmart',
        events: ['PURCHASE_COMPLETED', 'SUBSCRIPTION_CANCELLATION'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        platform: Platform.NUVEMSHOP,
        endpoint: 'https://api.example.com/webhooks/nuvemshop',
        events: ['order/created', 'product/updated'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    res.json({
      success: true,
      data: {
        configs,
        total: configs.length,
      },
    });
  });

  /**
   * Get sync logs
   * GET /api/acl/webhooks/sync-logs
   */
  public getSyncLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug({ query: req.query }, 'Getting sync logs');

    const filters = SyncLogQuerySchema.parse(req.query);

    // In a real implementation, this would fetch from database
    const syncLogs = [
      {
        id: '1',
        platform: Platform.HOTMART,
        entityType: 'order',
        entityId: 'order-123',
        operation: 'create',
        status: 'success',
        recordsAffected: 1,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 150,
      },
    ];

    res.json({
      success: true,
      data: {
        syncLogs,
        pagination: {
          total: syncLogs.length,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: false,
        },
        filters,
      },
    });
  });

  /**
   * Get webhook health status
   * GET /api/acl/webhooks/health
   */
  public getWebhookHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug('Getting webhook health status');

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      components: {
        webhookProcessing: { status: 'healthy', lastCheck: new Date() },
        eventQueue: { status: 'healthy', lastCheck: new Date() },
        rateLimiter: { status: 'healthy', lastCheck: new Date() },
        database: { status: 'healthy', lastCheck: new Date() },
      },
      metrics: {
        totalWebhooks: 1250,
        processedToday: 45,
        failedToday: 2,
        averageProcessingTime: 125,
      },
    };

    res.json({
      success: true,
      data: health,
    });
  });

  /**
   * Test webhook endpoint
   * POST /api/acl/webhooks/test
   */
  public testWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { platform, sampleData } = req.body;

    this.logger.info({ platform, sampleData }, 'Testing webhook processing');

    if (!platform || !Object.values(Platform).includes(platform)) {
      throw new ApiError(400, 'Valid platform is required');
    }

    try {
      // Create test webhook data
      const testWebhookData: BaseWebhookData = {
        id: `test-${Date.now()}`,
        platform: platform as Platform,
        eventType: WebhookEventType.ORDER_CREATED,
        eventId: `test-event-${Date.now()}`,
        payload: sampleData || { test: true },
        timestamp: new Date(),
      };

      const context = {
        platform: platform as Platform,
        headers: {} as any,
        timestamp: new Date(),
      };

      const result = await this.webhooksService.processWebhook(testWebhookData, context);

      res.json({
        success: true,
        data: {
          testResult: result,
          testData: testWebhookData,
        },
        message: 'Webhook test completed',
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_TEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  /**
   * Get webhook processing queue status
   * GET /api/acl/webhooks/queue/status
   */
  public getQueueStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    this.logger.debug('Getting webhook queue status');

    // In a real implementation, this would get actual queue statistics
    const queueStatus = {
      pending: 5,
      processing: 2,
      failed: 1,
      delayed: 0,
      total: 8,
      lastProcessed: new Date(),
      averageWaitTime: 2500, // milliseconds
      throughput: {
        perMinute: 12,
        perHour: 720,
        perDay: 17280,
      },
    };

    res.json({
      success: true,
      data: queueStatus,
    });
  });
}
