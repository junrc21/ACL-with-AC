import { Router } from 'express';
import { HealthController } from '@/modules/acl/controllers/health.controller';
import { ProductsController } from '@/modules/acl/controllers/products.controller';
import { CustomersController } from '@/modules/acl/controllers/customers.controller';
import { OrdersController } from '@/modules/acl/controllers/orders.controller';
import { CategoriesController } from '@/modules/acl/controllers/categories.controller';
import { validatePlatformCapability } from '@/middlewares/platform.middleware';
import { validateQuery, validateParams } from '@/middlewares/validation.middleware';
import { ProductQuerySchema } from '@/modules/acl/dto/product.dto';
import { CustomerFilterQuerySchema } from '@/modules/acl/dto/customer.dto';
import { OrderQuerySchema, OrderStatsQuerySchema } from '@/modules/acl/dto/order.dto';
import { CategoryQuerySchema } from '@/modules/acl/dto/category.dto';
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
      },
      supported_platforms: ['HOTMART', 'NUVEMSHOP', 'WOOCOMMERCE'],
      documentation: 'https://docs.cyriusx.com/acl-service',
    });
  });

  return router;
};

export default createRouter;
