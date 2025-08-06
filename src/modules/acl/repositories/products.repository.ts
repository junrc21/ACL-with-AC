import { PrismaClient, Product, Platform, ProductType } from '@prisma/client';
import { prisma } from '@/database';
import { ProductData, ProductProcessingResult, ProductStatus } from '@/shared/types/product.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Product repository for database operations
 */
export class ProductsRepository {
  private logger = createPlatformLogger('DATABASE', 'ProductsRepository');

  constructor(private db: PrismaClient = prisma) {}

  /**
   * Create a new product
   */
  async create(productData: ProductData): Promise<Product> {
    this.logger.info({
      platform: productData.platform,
      externalId: productData.externalId,
    }, 'Creating product');

    try {
      const product = await this.db.product.create({
        data: {
          platform: productData.platform as Platform,
          externalId: productData.externalId,
          storeId: productData.storeId || null,
          name: productData.name,
          description: productData.description || null,
          shortDescription: productData.shortDescription || null,
          slug: productData.slug || null,
          sku: productData.sku || null,
          type: productData.type as ProductType,
          status: productData.status as ProductStatus,
          regularPrice: productData.regularPrice || null,
          salePrice: productData.salePrice || null,
          currency: productData.currency || null,
          manageStock: productData.manageStock || null,
          stockQuantity: productData.stockQuantity || null,
          weight: productData.weight || null,
          length: productData.length || null,
          width: productData.width || null,
          height: productData.height || null,
          featured: productData.featured || null,
          catalogVisibility: productData.catalogVisibility || null,
          seoTitle: productData.seoTitle || null,
          seoDescription: productData.seoDescription || null,
          totalSales: productData.totalSales || null,
          metadata: productData.metadata as any,
          createdAt: productData.createdAt || new Date(),
          updatedAt: productData.updatedAt || new Date(),
        },
        include: {
          categories: true,
          images: true,
          variants: true,
        },
      });

      this.logger.info({
        productId: product.id,
        platform: product.platform,
        externalId: product.externalId,
      }, 'Product created successfully');

      return product;
    } catch (error) {
      this.logger.error({
        error,
        platform: productData.platform,
        externalId: productData.externalId,
      }, 'Failed to create product');
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async update(id: string, productData: Partial<ProductData>): Promise<Product> {
    this.logger.info({ productId: id }, 'Updating product');

    try {
      const product = await this.db.product.update({
        where: { id },
        data: {
          ...(productData.name && { name: productData.name }),
          ...(productData.description !== undefined && { description: productData.description || null }),
          ...(productData.shortDescription !== undefined && { shortDescription: productData.shortDescription || null }),
          ...(productData.slug !== undefined && { slug: productData.slug || null }),
          ...(productData.sku !== undefined && { sku: productData.sku || null }),
          ...(productData.type && { type: productData.type as ProductType }),
          ...(productData.status && { status: productData.status as ProductStatus }),
          ...(productData.regularPrice !== undefined && { regularPrice: productData.regularPrice || null }),
          ...(productData.salePrice !== undefined && { salePrice: productData.salePrice || null }),
          ...(productData.currency !== undefined && { currency: productData.currency || null }),
          ...(productData.manageStock !== undefined && { manageStock: productData.manageStock || null }),
          ...(productData.stockQuantity !== undefined && { stockQuantity: productData.stockQuantity || null }),
          ...(productData.weight !== undefined && { weight: productData.weight || null }),
          ...(productData.length !== undefined && { length: productData.length || null }),
          ...(productData.width !== undefined && { width: productData.width || null }),
          ...(productData.height !== undefined && { height: productData.height || null }),
          ...(productData.featured !== undefined && { featured: productData.featured || null }),
          ...(productData.catalogVisibility !== undefined && { catalogVisibility: productData.catalogVisibility || null }),
          ...(productData.seoTitle !== undefined && { seoTitle: productData.seoTitle || null }),
          ...(productData.seoDescription !== undefined && { seoDescription: productData.seoDescription || null }),
          ...(productData.totalSales !== undefined && { totalSales: productData.totalSales || null }),
          ...(productData.metadata && { metadata: productData.metadata as any }),
          updatedAt: new Date(),
        },
        include: {
          categories: true,
          images: true,
          variants: true,
        },
      });

      this.logger.info({
        productId: product.id,
        platform: product.platform,
        externalId: product.externalId,
      }, 'Product updated successfully');

      return product;
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to update product');
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | null> {
    try {
      const product = await this.db.product.findUnique({
        where: { id },
        include: {
          categories: true,
          images: true,
          variants: true,
        },
      });

      this.logger.debug({
        productId: id,
        found: !!product,
      }, 'Product lookup by ID');

      return product;
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to find product by ID');
      throw error;
    }
  }

  /**
   * Find product by platform and external ID
   */
  async findByPlatformAndExternalId(platform: Platform, externalId: string, storeId?: string): Promise<Product | null> {
    try {
      const where: any = {
        platform,
        externalId,
      };

      if (storeId) {
        where.storeId = storeId;
      }

      const product = await this.db.product.findFirst({
        where,
        include: {
          categories: true,
          images: true,
          variants: true,
        },
      });

      this.logger.debug({
        platform,
        externalId,
        storeId,
        found: !!product,
      }, 'Product lookup by platform and external ID');

      return product;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
        storeId,
      }, 'Failed to find product by platform and external ID');
      throw error;
    }
  }

  /**
   * Find products with filters and pagination
   */
  async findMany(filters: {
    platform?: Platform;
    storeId?: string;
    status?: ProductStatus;
    type?: ProductType;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const where: any = {};

      if (filters.platform) where.platform = filters.platform;
      if (filters.storeId) where.storeId = filters.storeId;
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;
      if (filters.featured !== undefined) where.featured = filters.featured;

      const orderBy: any = {};
      if (filters.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [products, total] = await Promise.all([
        this.db.product.findMany({
          where,
          include: {
            categories: true,
            images: true,
            variants: true,
          },
          orderBy,
          take: filters.limit || 20,
          skip: filters.offset || 0,
        }),
        this.db.product.count({ where }),
      ]);

      this.logger.debug({
        filters,
        count: products.length,
        total,
      }, 'Products query executed');

      return { products, total };
    } catch (error) {
      this.logger.error({
        error,
        filters,
      }, 'Failed to find products');
      throw error;
    }
  }

  /**
   * Delete product by ID
   */
  async delete(id: string): Promise<void> {
    this.logger.info({ productId: id }, 'Deleting product');

    try {
      await this.db.product.delete({
        where: { id },
      });

      this.logger.info({ productId: id }, 'Product deleted successfully');
    } catch (error) {
      this.logger.error({
        error,
        productId: id,
      }, 'Failed to delete product');
      throw error;
    }
  }

  /**
   * Upsert product (create or update)
   */
  async upsert(productData: ProductData): Promise<Product> {
    this.logger.info({
      platform: productData.platform,
      externalId: productData.externalId,
    }, 'Upserting product');

    try {
      const existingProduct = await this.findByPlatformAndExternalId(
        productData.platform as Platform,
        productData.externalId,
        productData.storeId
      );

      if (existingProduct) {
        return await this.update(existingProduct.id, productData);
      } else {
        return await this.create(productData);
      }
    } catch (error) {
      this.logger.error({
        error,
        platform: productData.platform,
        externalId: productData.externalId,
      }, 'Failed to upsert product');
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics(platform?: Platform, storeId?: string): Promise<Record<string, any>> {
    try {
      const where: any = {};
      if (platform) where.platform = platform;
      if (storeId) where.storeId = storeId;

      const [
        total,
        byStatus,
        byType,
        byPlatform,
        featured,
      ] = await Promise.all([
        this.db.product.count({ where }),
        this.db.product.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.db.product.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
        this.db.product.groupBy({
          by: ['platform'],
          where,
          _count: { platform: true },
        }),
        this.db.product.count({
          where: { ...where, featured: true },
        }),
      ]);

      const statistics = {
        total,
        featured,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        byPlatform: byPlatform.reduce((acc, item) => {
          acc[item.platform] = item._count.platform;
          return acc;
        }, {} as Record<string, number>),
      };

      this.logger.debug({ statistics, platform, storeId }, 'Product statistics generated');

      return statistics;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId,
      }, 'Failed to get product statistics');
      throw error;
    }
  }
}
