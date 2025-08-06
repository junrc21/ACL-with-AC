import { Product } from '@prisma/client';
import { ProductsRepository } from '../repositories/products.repository';
import { productStrategyFactory } from '../strategies/factories/ProductStrategyFactory';
import { 
  ProductData, 
  ProductProcessingResult,
  ProductType,
  ProductStatus 
} from '@/shared/types/product.types';
import { Platform, StrategyContext, PlatformError } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Product service for business logic
 */
export class ProductsService {
  private logger = createPlatformLogger('SERVICE', 'ProductsService');

  constructor(
    private productsRepository: ProductsRepository = new ProductsRepository()
  ) {}

  /**
   * Process product data from any platform
   */
  async processProduct(
    platform: Platform,
    data: any,
    context: StrategyContext
  ): Promise<ProductProcessingResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      storeId: context.storeId,
    }, 'Processing product data');

    try {
      // Get platform strategy
      const strategy = productStrategyFactory.createStrategy(platform);

      // Validate data
      const validation = strategy.validateProductData(data);
      if (!validation.isValid) {
        return {
          success: false,
          externalId: data.id?.toString() || 'unknown',
          platform,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Parse product data
      const productData = await strategy.parseProduct(data, context);

      // Save to database
      const product = await this.productsRepository.upsert(productData);

      const processingTime = Date.now() - startTime;

      this.logger.info({
        productId: product.id,
        platform,
        externalId: product.externalId,
        processingTime,
      }, 'Product processed successfully');

      return {
        success: true,
        productId: product.id,
        externalId: product.externalId,
        platform,
        warnings: validation.warnings,
        metadata: {
          processingTime,
          isNew: !await this.productsRepository.findByPlatformAndExternalId(
            platform,
            product.externalId,
            product.storeId || undefined
          ),
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error({
        error,
        platform,
        storeId: context.storeId,
        processingTime,
      }, 'Failed to process product');

      if (error instanceof PlatformError) {
        return {
          success: false,
          externalId: data.id?.toString() || 'unknown',
          platform,
          errors: [error.message],
          metadata: { processingTime },
        };
      }

      throw error;
    }
  }

  /**
   * Process multiple products in bulk
   */
  async processBulkProducts(
    platform: Platform,
    products: any[],
    context: StrategyContext,
    options: {
      skipValidation?: boolean;
      continueOnError?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    results: ProductProcessingResult[];
  }> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      count: products.length,
      options,
    }, 'Processing bulk products');

    const results: ProductProcessingResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const [index, productData] of products.entries()) {
      try {
        const result = await this.processProduct(platform, productData, context);
        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
          if (!options.continueOnError) {
            this.logger.warn({
              index,
              platform,
              errors: result.errors,
            }, 'Stopping bulk processing due to error');
            break;
          }
        }

      } catch (error) {
        failed++;
        const errorResult: ProductProcessingResult = {
          success: false,
          externalId: productData.id?.toString() || `index-${index}`,
          platform,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
        results.push(errorResult);

        this.logger.error({
          error,
          index,
          platform,
        }, 'Error processing product in bulk');

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const processingTime = Date.now() - startTime;

    this.logger.info({
      platform,
      totalProcessed: results.length,
      successful,
      failed,
      processingTime,
    }, 'Bulk product processing completed');

    return {
      totalProcessed: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    this.logger.debug({ productId: id }, 'Getting product by ID');

    try {
      return await this.productsRepository.findById(id);
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to get product');
      throw error;
    }
  }

  /**
   * Get product by platform and external ID
   */
  async getProductByExternalId(
    platform: Platform,
    externalId: string,
    storeId?: string
  ): Promise<Product | null> {
    this.logger.debug({
      platform,
      externalId,
      storeId,
    }, 'Getting product by external ID');

    try {
      return await this.productsRepository.findByPlatformAndExternalId(
        platform,
        externalId,
        storeId
      );
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
        storeId,
      }, 'Failed to get product by external ID');
      throw error;
    }
  }

  /**
   * List products with filters and pagination
   */
  async listProducts(filters: {
    platform?: Platform;
    storeId?: string;
    status?: ProductStatus;
    type?: ProductType;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    products: Product[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    this.logger.debug({ filters }, 'Listing products');

    try {
      const { products, total } = await this.productsRepository.findMany(filters);

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      return {
        products,
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrevious: offset > 0,
        },
      };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to list products');
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<ProductData>): Promise<Product> {
    this.logger.info({ productId: id }, 'Updating product');

    try {
      const existingProduct = await this.productsRepository.findById(id);
      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      return await this.productsRepository.update(id, updates);
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to update product');
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    this.logger.info({ productId: id }, 'Deleting product');

    try {
      const existingProduct = await this.productsRepository.findById(id);
      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      await this.productsRepository.delete(id);
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to delete product');
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics(platform?: Platform, storeId?: string): Promise<Record<string, any>> {
    this.logger.debug({ platform, storeId }, 'Getting product statistics');

    try {
      return await this.productsRepository.getStatistics(platform, storeId);
    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId,
      }, 'Failed to get product statistics');
      throw error;
    }
  }

  /**
   * Validate product data for a specific platform
   */
  async validateProductData(platform: Platform, data: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    this.logger.debug({ platform }, 'Validating product data');

    try {
      const strategy = productStrategyFactory.createStrategy(platform);
      return strategy.validateProductData(data);
    } catch (error) {
      this.logger.error({
        error,
        platform,
      }, 'Failed to validate product data');
      throw error;
    }
  }

  /**
   * Transform product data to platform format
   */
  async transformToplatformFormat(productId: string): Promise<any> {
    this.logger.debug({ productId }, 'Transforming product to platform format');

    try {
      const product = await this.productsRepository.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const strategy = productStrategyFactory.createStrategy(product.platform as Platform);
      
      if (typeof strategy.transformToplatformFormat === 'function') {
        const productData: ProductData = {
          platform: product.platform as Platform,
          externalId: product.externalId,
          storeId: product.storeId || undefined,
          name: product.name,
          description: product.description || undefined,
          shortDescription: product.shortDescription || undefined,
          slug: product.slug || undefined,
          sku: product.sku || undefined,
          type: product.type as ProductType,
          status: product.status as ProductStatus,
          regularPrice: product.regularPrice ? (typeof product.regularPrice === 'object' ? product.regularPrice.toNumber() : product.regularPrice) : undefined,
          salePrice: product.salePrice ? (typeof product.salePrice === 'object' ? product.salePrice.toNumber() : product.salePrice) : undefined,
          currency: product.currency || undefined,
          manageStock: product.manageStock || undefined,
          stockQuantity: product.stockQuantity || undefined,
          weight: product.weight ? (typeof product.weight === 'object' ? product.weight.toNumber() : product.weight) : undefined,
          length: product.length ? (typeof product.length === 'object' ? product.length.toNumber() : product.length) : undefined,
          width: product.width ? (typeof product.width === 'object' ? product.width.toNumber() : product.width) : undefined,
          height: product.height ? (typeof product.height === 'object' ? product.height.toNumber() : product.height) : undefined,
          featured: product.featured || undefined,
          catalogVisibility: product.catalogVisibility || undefined,
          seoTitle: product.seoTitle || undefined,
          seoDescription: product.seoDescription || undefined,
          totalSales: product.totalSales || undefined,
          metadata: product.metadata as Record<string, any>,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };

        return strategy.transformToplatformFormat(productData);
      }

      throw new Error(`Platform ${product.platform} does not support transformation to platform format`);
    } catch (error) {
      this.logger.error({
        error,
        productId,
      }, 'Failed to transform product to platform format');
      throw error;
    }
  }
}
