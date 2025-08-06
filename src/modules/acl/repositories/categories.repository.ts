import { PrismaClient, Category, Platform } from '@prisma/client';
import { prisma } from '@/database';
import { CategoryData, CategoryQueryParams, CategoryHierarchy } from '@/shared/types/category.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Category repository for database operations
 */
export class CategoriesRepository {
  private logger = createPlatformLogger('DATABASE', 'CategoriesRepository');

  constructor(private db: PrismaClient = prisma) {}

  /**
   * Create a new category
   */
  async create(categoryData: CategoryData): Promise<Category> {
    this.logger.info({
      platform: categoryData.platform,
      externalId: categoryData.externalId,
      name: categoryData.name,
    }, 'Creating category');

    try {
      const category = await this.db.category.create({
        data: {
          platform: categoryData.platform as Platform,
          externalId: categoryData.externalId,
          storeId: categoryData.storeId || '',
          name: categoryData.name,
          description: categoryData.description || null,
          slug: categoryData.slug,
          parentId: categoryData.parentId || null,
          seoTitle: categoryData.seoTitle || null,
          seoDescription: categoryData.seoDescription || null,
          metadata: categoryData.metadata as any,
        },
      });

      this.logger.info({
        id: category.id,
        platform: category.platform,
        externalId: category.externalId,
      }, 'Category created successfully');

      return category;
    } catch (error) {
      this.logger.error({
        error,
        platform: categoryData.platform,
        externalId: categoryData.externalId,
      }, 'Failed to create category');
      throw error;
    }
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    this.logger.debug({ id }, 'Finding category by ID');

    try {
      const category = await this.db.category.findUnique({
        where: { id },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.debug({
        id,
        found: !!category,
      }, 'Category search by ID completed');

      return category;
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to find category by ID');
      throw error;
    }
  }

  /**
   * Find category by platform and external ID
   */
  async findByPlatformAndExternalId(platform: Platform, externalId: string): Promise<Category | null> {
    this.logger.debug({
      platform,
      externalId,
    }, 'Finding category by platform and external ID');

    try {
      const category = await this.db.category.findUnique({
        where: {
          platform_storeId_externalId: {
            platform,
            storeId: '', // Default empty string for now
            externalId,
          },
        },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.debug({
        platform,
        externalId,
        found: !!category,
      }, 'Category search by platform and external ID completed');

      return category;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
      }, 'Failed to find category by platform and external ID');
      throw error;
    }
  }

  /**
   * Find categories with query parameters
   */
  async findMany(params: CategoryQueryParams = {}): Promise<{
    categories: Category[];
    total: number;
  }> {
    this.logger.debug({ params }, 'Finding categories with parameters');

    try {
      const {
        platform,
        storeId,
        parentId,
        search,
        includeEmpty = true,
        page = 1,
        limit = 50,
        sortBy = 'name',
        sortOrder = 'asc',
      } = params;

      // Build where clause
      const where: any = {};

      if (platform) {
        where.platform = platform;
      }

      if (storeId) {
        where.storeId = storeId;
      }

      if (parentId !== undefined) {
        where.parentId = parentId || null;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build order by clause
      const orderBy: any = {};
      if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
        orderBy.updatedAt = sortOrder;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries
      const [categories, total] = await Promise.all([
        this.db.category.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            products: {
              include: {
                product: true,
              },
            },
          },
        }),
        this.db.category.count({ where }),
      ]);

      this.logger.debug({
        count: categories.length,
        total,
        page,
        limit,
      }, 'Categories found');

      return { categories, total };
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to find categories');
      throw error;
    }
  }

  /**
   * Update category
   */
  async update(id: string, categoryData: Partial<CategoryData>): Promise<Category> {
    this.logger.info({
      id,
      updates: Object.keys(categoryData),
    }, 'Updating category');

    try {
      const updateData: any = {};

      if (categoryData.name !== undefined) updateData.name = categoryData.name;
      if (categoryData.description !== undefined) updateData.description = categoryData.description;
      if (categoryData.slug !== undefined) updateData.slug = categoryData.slug;
      if (categoryData.parentId !== undefined) updateData.parentId = categoryData.parentId;
      if (categoryData.seoTitle !== undefined) updateData.seoTitle = categoryData.seoTitle;
      if (categoryData.seoDescription !== undefined) updateData.seoDescription = categoryData.seoDescription;
      if (categoryData.metadata !== undefined) updateData.metadata = categoryData.metadata;

      const category = await this.db.category.update({
        where: { id },
        data: updateData,
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.info({
        id: category.id,
        platform: category.platform,
        externalId: category.externalId,
      }, 'Category updated successfully');

      return category;
    } catch (error) {
      this.logger.error({
        error,
        id,
        updates: Object.keys(categoryData),
      }, 'Failed to update category');
      throw error;
    }
  }

  /**
   * Delete category
   */
  async delete(id: string): Promise<void> {
    this.logger.info({ id }, 'Deleting category');

    try {
      await this.db.category.delete({
        where: { id },
      });

      this.logger.info({ id }, 'Category deleted successfully');
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete category');
      throw error;
    }
  }

  /**
   * Get category hierarchy for a platform/store
   */
  async getHierarchy(platform?: Platform, storeId?: string): Promise<Category[]> {
    this.logger.debug({
      platform,
      storeId,
    }, 'Getting category hierarchy');

    try {
      const where: any = {};

      if (platform) {
        where.platform = platform;
      }

      if (storeId) {
        where.storeId = storeId;
      }

      const categories = await this.db.category.findMany({
        where,
        orderBy: [
          { parentId: 'asc' },
          { name: 'asc' },
        ],
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.debug({
        count: categories.length,
        platform,
        storeId,
      }, 'Category hierarchy retrieved');

      return categories;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId,
      }, 'Failed to get category hierarchy');
      throw error;
    }
  }

  /**
   * Get root categories (categories without parent)
   */
  async getRootCategories(platform?: Platform, storeId?: string): Promise<Category[]> {
    this.logger.debug({
      platform,
      storeId,
    }, 'Getting root categories');

    try {
      const where: any = {
        parentId: null,
      };

      if (platform) {
        where.platform = platform;
      }

      if (storeId) {
        where.storeId = storeId;
      }

      const categories = await this.db.category.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.debug({
        count: categories.length,
        platform,
        storeId,
      }, 'Root categories retrieved');

      return categories;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId,
      }, 'Failed to get root categories');
      throw error;
    }
  }

  /**
   * Get child categories for a parent category
   */
  async getChildCategories(parentId: string): Promise<Category[]> {
    this.logger.debug({ parentId }, 'Getting child categories');

    try {
      const categories = await this.db.category.findMany({
        where: { parentId },
        orderBy: { name: 'asc' },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.debug({
        count: categories.length,
        parentId,
      }, 'Child categories retrieved');

      return categories;
    } catch (error) {
      this.logger.error({
        error,
        parentId,
      }, 'Failed to get child categories');
      throw error;
    }
  }

  /**
   * Check if category exists
   */
  async exists(platform: Platform, externalId: string, storeId?: string): Promise<boolean> {
    try {
      const category = await this.db.category.findUnique({
        where: {
          platform_storeId_externalId: {
            platform,
            storeId: storeId || '',
            externalId,
          },
        },
      });

      return !!category;
    } catch (error) {
      this.logger.error({
        error,
        platform,
        externalId,
        storeId,
      }, 'Failed to check category existence');
      return false;
    }
  }

  /**
   * Upsert category (create or update)
   */
  async upsert(categoryData: CategoryData): Promise<Category> {
    this.logger.info({
      platform: categoryData.platform,
      externalId: categoryData.externalId,
    }, 'Upserting category');

    try {
      const category = await this.db.category.upsert({
        where: {
          platform_storeId_externalId: {
            platform: categoryData.platform as Platform,
            storeId: categoryData.storeId || '',
            externalId: categoryData.externalId,
          },
        },
        create: {
          platform: categoryData.platform as Platform,
          externalId: categoryData.externalId,
          storeId: categoryData.storeId || '',
          name: categoryData.name,
          description: categoryData.description || null,
          slug: categoryData.slug,
          parentId: categoryData.parentId || null,
          seoTitle: categoryData.seoTitle || null,
          seoDescription: categoryData.seoDescription || null,
          metadata: categoryData.metadata as any,
        },
        update: {
          name: categoryData.name,
          description: categoryData.description || null,
          slug: categoryData.slug,
          parentId: categoryData.parentId || null,
          seoTitle: categoryData.seoTitle || null,
          seoDescription: categoryData.seoDescription || null,
          metadata: categoryData.metadata as any,
        },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.info({
        id: category.id,
        platform: category.platform,
        externalId: category.externalId,
      }, 'Category upserted successfully');

      return category;
    } catch (error) {
      this.logger.error({
        error,
        platform: categoryData.platform,
        externalId: categoryData.externalId,
      }, 'Failed to upsert category');
      throw error;
    }
  }
}
