import { Router } from 'express';
import { HealthController } from '@/modules/acl/controllers/health.controller';
import { ProductsController } from '@/modules/acl/controllers/products.controller';
import { CustomersController } from '@/modules/acl/controllers/customers.controller';
import { OrdersController } from '@/modules/acl/controllers/orders.controller';
import { CategoriesController } from '@/modules/acl/controllers/categories.controller';
import { DiscountsController } from '@/modules/acl/controllers/discounts.controller';
import { CampaignsController } from '@/modules/acl/controllers/campaigns.controller';
import { WebhooksController } from '@/modules/acl/controllers/webhooks.controller';
import { validatePlatformCapability } from '@/middlewares/platform.middleware';
import { validateQuery, validateParams } from '@/middlewares/validation.middleware';
import { webhookMiddleware } from '@/middlewares/webhook.middleware';
import { ProductQuerySchema } from '@/modules/acl/dto/product.dto';
import { CustomerFilterQuerySchema } from '@/modules/acl/dto/customer.dto';
import { OrderQuerySchema, OrderStatsQuerySchema } from '@/modules/acl/dto/order.dto';
import { CategoryQuerySchema } from '@/modules/acl/dto/category.dto';
import { WebhookQuerySchema, WebhookStatisticsRequestSchema } from '@/modules/acl/dto/webhook.dto';
import { Platform } from '@/shared/types/platform.types';
import { z } from 'zod';

/**
 * Main router for the ACL service
 */
export const createRouter = (): Router => {
  const router = Router();
  const healthController = new HealthController();
  const productsController = new ProductsController();
  const customersController = new CustomersController();
  const ordersController = new OrdersController();
  const categoriesController = new CategoriesController();
  const discountsController = new DiscountsController();
  const campaignsController = new CampaignsController();
  const webhooksController = new WebhooksController();

  // Health check routes
  router.get('/health', healthController.health);
  router.get('/health/detailed', healthController.detailedHealth);
  router.get('/health/ready', healthController.ready);
  router.get('/health/live', healthController.live);

  // Products routes
  router.post('/products',
    validatePlatformCapability('supportsProducts'),
    productsController.createProduct
  );

  router.post('/products/bulk',
    validatePlatformCapability('supportsProducts'),
    productsController.createBulkProducts
  );

  router.get('/products',
    validateQuery(ProductQuerySchema),
    productsController.listProducts
  );

  router.get('/products/statistics',
    productsController.getStatistics
  );

  router.post('/products/validate',
    validatePlatformCapability('supportsProducts'),
    productsController.validateProduct
  );

  router.get('/products/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    productsController.getProduct
  );

  router.put('/products/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsProducts'),
    productsController.updateProduct
  );

  router.delete('/products/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsProducts'),
    productsController.deleteProduct
  );

  router.get('/products/:id/transform',
    validateParams(z.object({ id: z.string().uuid() })),
    productsController.transformProduct
  );

  // Customer routes
  router.post('/customers/sync',
    validatePlatformCapability('supportsCustomers'),
    async (req, res) => await customersController.syncCustomers(req as any, res)
  );

  router.get('/customers/statistics',
    async (req, res) => await customersController.getStatistics(req as any, res)
  );

  router.get('/customers/search',
    async (req, res) => await customersController.searchCustomers(req as any, res)
  );

  router.get('/customers',
    validateQuery(CustomerFilterQuerySchema),
    async (req, res) => await customersController.getCustomers(req as any, res)
  );

  router.get('/customers/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    async (req, res) => await customersController.getCustomerById(req, res)
  );

  router.put('/customers/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    async (req, res) => await customersController.updateCustomer(req, res)
  );

  router.delete('/customers/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    async (req, res) => await customersController.deleteCustomer(req, res)
  );

  // Orders routes
  router.post('/orders',
    validatePlatformCapability('supportsOrders'),
    ordersController.createOrder
  );

  router.post('/orders/sync',
    validatePlatformCapability('supportsOrders'),
    ordersController.syncOrders
  );

  router.get('/orders',
    validateQuery(OrderQuerySchema),
    ordersController.getOrders
  );

  router.get('/orders/statistics',
    validateQuery(OrderStatsQuerySchema),
    ordersController.getOrderStatistics
  );

  router.get('/orders/search',
    ordersController.searchOrders
  );

  router.get('/orders/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    ordersController.getOrderById
  );

  router.put('/orders/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsOrders'),
    ordersController.updateOrder
  );

  router.delete('/orders/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsOrders'),
    ordersController.deleteOrder
  );

  // Categories routes
  router.post('/categories',
    validatePlatformCapability('supportsProducts'), // Categories are related to products
    categoriesController.createCategory
  );

  router.post('/categories/sync',
    validatePlatformCapability('supportsProducts'),
    categoriesController.syncCategories
  );

  router.get('/categories',
    validateQuery(CategoryQuerySchema),
    categoriesController.getCategories
  );

  router.get('/categories/tree',
    categoriesController.getCategoryTree
  );

  router.get('/categories/statistics',
    categoriesController.getCategoryStatistics
  );

  router.get('/categories/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    categoriesController.getCategoryById
  );

  router.get('/categories/:id/path',
    validateParams(z.object({ id: z.string().uuid() })),
    categoriesController.getCategoryPath
  );

  router.put('/categories/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsProducts'),
    categoriesController.updateCategory
  );

  router.delete('/categories/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsProducts'),
    categoriesController.deleteCategory
  );

  // Discounts & Coupons routes
  router.post('/discounts/coupons',
    validatePlatformCapability('supportsCoupons'),
    discountsController.createCoupon
  );

  router.get('/discounts/coupons',
    discountsController.listCoupons
  );

  router.get('/discounts/coupons/statistics',
    discountsController.getCouponStatistics
  );

  router.get('/discounts/coupons/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    discountsController.getCouponById
  );

  router.get('/discounts/coupons/code/:code',
    validateParams(z.object({ code: z.string().min(1) })),
    discountsController.getCouponByCode
  );

  router.put('/discounts/coupons/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    discountsController.updateCoupon
  );

  router.delete('/discounts/coupons/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    discountsController.deleteCoupon
  );

  router.post('/discounts/coupons/validate',
    validatePlatformCapability('supportsCoupons'),
    discountsController.validateCoupon
  );

  router.post('/discounts/coupons/apply',
    validatePlatformCapability('supportsCoupons'),
    discountsController.applyDiscount
  );

  router.post('/discounts/sync',
    validatePlatformCapability('supportsCoupons'),
    discountsController.syncCoupons
  );

  router.get('/discounts/platforms/:platform/capabilities',
    validateParams(z.object({ platform: z.enum(['HOTMART', 'NUVEMSHOP', 'WOOCOMMERCE']) })),
    discountsController.getPlatformCapabilities
  );

  router.get('/discounts/health',
    discountsController.healthCheck
  );

  // Campaigns routes
  router.post('/campaigns',
    validatePlatformCapability('supportsCoupons'),
    campaignsController.createCampaign
  );

  router.get('/campaigns',
    campaignsController.listCampaigns
  );

  router.get('/campaigns/statistics',
    campaignsController.getCampaignStatistics
  );

  router.get('/campaigns/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    campaignsController.getCampaignById
  );

  router.get('/campaigns/:id/analytics',
    validateParams(z.object({ id: z.string().uuid() })),
    campaignsController.getCampaignAnalytics
  );

  router.put('/campaigns/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.updateCampaign
  );

  router.delete('/campaigns/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.deleteCampaign
  );

  router.post('/campaigns/:id/rules',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.addDiscountRule
  );

  router.post('/campaigns/:id/activate',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.activateCampaign
  );

  router.post('/campaigns/:id/deactivate',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.deactivateCampaign
  );

  router.post('/campaigns/:id/pause',
    validateParams(z.object({ id: z.string().uuid() })),
    validatePlatformCapability('supportsCoupons'),
    campaignsController.pauseCampaign
  );

  router.get('/campaigns/health',
    campaignsController.healthCheck
  );

  // Webhook routes
  router.post('/webhooks/hotmart',
    ...webhookMiddleware,
    webhooksController.receiveHotmartWebhook
  );

  router.post('/webhooks/nuvemshop',
    ...webhookMiddleware,
    webhooksController.receiveNuvemshopWebhook
  );

  router.post('/webhooks/woocommerce',
    ...webhookMiddleware,
    webhooksController.receiveWooCommerceWebhook
  );

  router.get('/webhooks',
    validateQuery(WebhookQuerySchema),
    webhooksController.getWebhooks
  );

  router.get('/webhooks/statistics',
    validateQuery(WebhookStatisticsRequestSchema),
    webhooksController.getStatistics
  );

  router.get('/webhooks/:id',
    validateParams(z.object({ id: z.string().uuid() })),
    webhooksController.getWebhookById
  );

  router.post('/webhooks/:id/retry',
    validateParams(z.object({ id: z.string().uuid() })),
    webhooksController.retryWebhook
  );

  router.post('/webhooks/retry-failed',
    webhooksController.retryFailedWebhooks
  );

  // Webhook management routes
  router.post('/webhooks/register',
    webhooksController.registerWebhook
  );

  router.get('/webhooks/config',
    webhooksController.getWebhookConfigs
  );

  router.put('/webhooks/config/:id',
    validateParams(z.object({ id: z.string() })),
    webhooksController.updateWebhookConfig
  );

  router.get('/webhooks/sync-logs',
    validateQuery(z.object({
      platform: z.nativeEnum(Platform).optional(),
      entityType: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    })),
    webhooksController.getSyncLogs
  );

  router.get('/webhooks/health',
    webhooksController.getWebhookHealth
  );

  router.post('/webhooks/test',
    webhooksController.testWebhook
  );

  router.get('/webhooks/queue/status',
    webhooksController.getQueueStatus
  );

  // API version info
  router.get('/', (req, res) => {
    res.json({
      service: 'ACL Service',
      version: '1.0.0',
      description: 'Anti-Corruption Layer for multi-platform e-commerce integration',
      endpoints: {
        health: '/api/acl/health',
        detailed_health: '/api/acl/health/detailed',
        readiness: '/api/acl/health/ready',
        liveness: '/api/acl/health/live',
        products: '/api/acl/products',
        bulk_products: '/api/acl/products/bulk',
        product_statistics: '/api/acl/products/statistics',
        validate_product: '/api/acl/products/validate',
        customers: '/api/acl/customers',
        customer_sync: '/api/acl/customers/sync',
        customer_statistics: '/api/acl/customers/statistics',
        customer_search: '/api/acl/customers/search',
        orders: '/api/acl/orders',
        order_sync: '/api/acl/orders/sync',
        order_statistics: '/api/acl/orders/statistics',
        order_search: '/api/acl/orders/search',
        categories: '/api/acl/categories',
        category_sync: '/api/acl/categories/sync',
        category_tree: '/api/acl/categories/tree',
        category_statistics: '/api/acl/categories/statistics',
        discounts: '/api/acl/discounts/coupons',
        coupon_validation: '/api/acl/discounts/coupons/validate',
        coupon_application: '/api/acl/discounts/coupons/apply',
        discount_sync: '/api/acl/discounts/sync',
        discount_capabilities: '/api/acl/discounts/platforms/{platform}/capabilities',
        campaigns: '/api/acl/campaigns',
        campaign_analytics: '/api/acl/campaigns/{id}/analytics',
        campaign_rules: '/api/acl/campaigns/{id}/rules',
        webhooks_hotmart: '/api/acl/webhooks/hotmart',
        webhooks_nuvemshop: '/api/acl/webhooks/nuvemshop',
        webhooks_woocommerce: '/api/acl/webhooks/woocommerce',
        webhook_list: '/api/acl/webhooks',
        webhook_statistics: '/api/acl/webhooks/statistics',
        webhook_retry: '/api/acl/webhooks/{id}/retry',
        webhook_retry_failed: '/api/acl/webhooks/retry-failed',
        webhook_register: '/api/acl/webhooks/register',
        webhook_config: '/api/acl/webhooks/config',
        webhook_sync_logs: '/api/acl/webhooks/sync-logs',
        webhook_health: '/api/acl/webhooks/health',
        webhook_test: '/api/acl/webhooks/test',
        webhook_queue_status: '/api/acl/webhooks/queue/status',
      },
      supported_platforms: ['HOTMART', 'NUVEMSHOP', 'WOOCOMMERCE'],
      documentation: 'https://docs.cyriusx.com/acl-service',
    });
  });

  return router;
};

export default createRouter;
