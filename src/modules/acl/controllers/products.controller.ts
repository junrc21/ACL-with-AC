import { Request, Response } from 'express';
import { ProductsService } from '../services/products.service';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { asyncHandler, ApiError } from '@/middlewares/error.middleware';
import { 
  CreateProductRequestSchema,
  UpdateProductRequestSchema,
  ProductQuerySchema,
  BulkProductRequestSchema,
  HotmartProductSchema,
  NuvemshopProductSchema,
  WooCommerceProductSchema
} from '../dto/product.dto';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Products controller for handling HTTP requests
 */
export class ProductsController {
  private logger = createPlatformLogger('CONTROLLER', 'ProductsController');

  constructor(
    private productsService: ProductsService = new ProductsService()
  ) {}

  /**
   * Create/process a single product
   * POST /api/acl/products
   */
  public createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
    }, 'Processing product creation request');

    // Validate request body based on platform
    const validatedData = this.validatePlatformData(platform, req.body);

    // Create strategy context
    const context = {
      platform,
      storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Process product
    const result = await this.productsService.processProduct(
      platform,
      validatedData,
      context
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          productId: result.productId,
          externalId: result.externalId,
          platform: result.platform,
          warnings: result.warnings,
          metadata: result.metadata,
        },
        message: 'Product processed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_PROCESSING_FAILED',
          message: 'Failed to process product data',
          details: {
            externalId: result.externalId,
            platform: result.platform,
            errors: result.errors,
            warnings: result.warnings,
          },
        },
      });
    }
  });

  /**
   * Process multiple products in bulk
   * POST /api/acl/products/bulk
   */
  public createBulkProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      count: req.body.products?.length,
    }, 'Processing bulk products request');

    // Validate bulk request
    const validatedRequest = BulkProductRequestSchema.parse(req.body);

    // Create strategy context
    const context = {
      platform,
      storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Process products in bulk
    const result = await this.productsService.processBulkProducts(
      platform,
      validatedRequest.products,
      context,
      validatedRequest.options
    );

    res.status(200).json({
      success: true,
      data: {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        summary: {
          platform,
          storeId,
          processingTime: Date.now() - context.timestamp.getTime(),
        },
      },
      message: `Processed ${result.totalProcessed} products: ${result.successful} successful, ${result.failed} failed`,
    });
  });

  /**
   * Get product by ID
   * GET /api/acl/products/:id
   */
  public getProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.debug({ productId: id }, 'Getting product by ID');

    const product = await this.productsService.getProduct(id);

    if (!product) {
      throw new ApiError(404, `Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: product,
    });
  });

  /**
   * List products with filters and pagination
   * GET /api/acl/products
   */
  public listProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;

    this.logger.debug({
      query: req.query,
      platform: platformRequest.platform,
    }, 'Listing products');

    // Validate query parameters
    const filters = ProductQuerySchema.parse(req.query);

    // Add platform filter if not specified
    if (!filters.platform) {
      filters.platform = platformRequest.platform;
    }

    // Add store filter if available
    if (!filters.storeId && platformRequest.storeId) {
      filters.storeId = platformRequest.storeId;
    }

    const result = await this.productsService.listProducts(filters);

    res.json({
      success: true,
      data: {
        products: result.products,
        pagination: result.pagination,
        filters: {
          platform: filters.platform,
          storeId: filters.storeId,
          status: filters.status,
          type: filters.type,
          featured: filters.featured,
        },
      },
    });
  });

  /**
   * Update product by ID
   * PUT /api/acl/products/:id
   */
  public updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({ productId: id }, 'Updating product');

    // For updates, we just use the body data directly
    const updateData = req.body;

    const product = await this.productsService.updateProduct(id, updateData);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  });

  /**
   * Delete product by ID
   * DELETE /api/acl/products/:id
   */
  public deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.info({ productId: id }, 'Deleting product');

    await this.productsService.deleteProduct(id);

    res.status(204).send();
  });

  /**
   * Get product statistics
   * GET /api/acl/products/statistics
   */
  public getStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({ platform, storeId }, 'Getting product statistics');

    const statistics = await this.productsService.getStatistics(platform, storeId);

    res.json({
      success: true,
      data: {
        platform,
        storeId,
        statistics,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * Validate product data for a platform
   * POST /api/acl/products/validate
   */
  public validateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform } = platformRequest;

    this.logger.debug({ platform }, 'Validating product data');

    const validation = await this.productsService.validateProductData(platform, req.body);

    res.json({
      success: true,
      data: {
        platform,
        validation,
      },
    });
  });

  /**
   * Transform product to platform format
   * GET /api/acl/products/:id/transform
   */
  public transformProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    this.logger.debug({ productId: id }, 'Transforming product to platform format');

    const transformedData = await this.productsService.transformToplatformFormat(id);

    res.json({
      success: true,
      data: {
        productId: id,
        transformedData,
      },
    });
  });

  /**
   * Validate platform-specific data
   */
  private validatePlatformData(platform: Platform, data: any): any {
    switch (platform) {
      case Platform.HOTMART:
        return HotmartProductSchema.parse(data);
      case Platform.NUVEMSHOP:
        return NuvemshopProductSchema.parse(data);
      case Platform.WOOCOMMERCE:
        return WooCommerceProductSchema.parse(data);
      default:
        throw new ApiError(
          400,
          `Unsupported platform: ${platform}`,
          'UNSUPPORTED_PLATFORM'
        );
    }
  }
}
