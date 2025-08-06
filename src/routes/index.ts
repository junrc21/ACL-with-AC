import { Router } from 'express';
import { HealthController } from '@/modules/acl/controllers/health.controller';
import { ProductsController } from '@/modules/acl/controllers/products.controller';
import { validatePlatformCapability } from '@/middlewares/platform.middleware';
import { validateBody, validateQuery, validateParams } from '@/middlewares/validation.middleware';
import { ProductQuerySchema } from '@/modules/acl/dto/product.dto';
import { z } from 'zod';

/**
 * Main router for the ACL service
 */
export const createRouter = (): Router => {
  const router = Router();
  const healthController = new HealthController();
  const productsController = new ProductsController();

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
      },
      supported_platforms: ['HOTMART', 'NUVEMSHOP', 'WOOCOMMERCE'],
      documentation: 'https://docs.cyriusx.com/acl-service',
    });
  });

  return router;
};

export default createRouter;
